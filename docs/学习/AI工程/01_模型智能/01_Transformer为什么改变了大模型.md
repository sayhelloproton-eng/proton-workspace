# Transformer 为什么改变了大模型

> 唯一职责：解释 Token、Embedding、Attention、Q/K/V、自回归生成与 Transformer 的底座地位。  
> 读完要能回答：一次 Transformer 模型调用，怎样把文字表示、注意力计算与自回归生成连接成完整链路？
> 阅读对象：AI / Agent 应用工程学习者；目标是建立可用于模型服务调用、本地推理与后续 Agent 工程的稳定心智模型，而不是推导底层数学与硬件内核实现。

<a id="ch01-30s-core"></a>
<a id="ch01-3m-mental-model"></a>
<a id="ch01-15m-mainline"></a>
## 从一句输入到第一个输出 Token

用户在输入框里写下一句话时，模型不会直接接收到“意思”，也不会一次写好整段回答。文字要先变成模型能够计算的数字表示；模型完成一轮计算后，只选出下一个 Token，再把它接回已有文本继续下一轮。

### 本节新词

- **Tokenizer（分词器）**：把原始文字切成模型词表能够处理的片段。不同模型使用的 Tokenizer 不同，同一句话可能得到不同切分结果。
- **LLM（Large Language Model，大语言模型）**：用大规模文本等数据训练、能够理解和生成语言的模型。本章讨论的 GPT 类生成模型属于 LLM。
- **Token（词元）**：Tokenizer 切出的处理片段，可能是一个字、一个词的一部分、标点或其他子串，不固定等于人类语言中的“单词”。
- **Vocabulary（词表）与 Token ID（词元编号）**：词表保存模型认识的 Token 集合，Token ID 是某个 Token 在词表中的整数编号。编号只负责定位，不直接携带连续语义。
- **Token Embedding（Token 嵌入）**：模型根据 Token ID 查到的一组连续数值，是 Token 进入神经网络计算时使用的基础表示。
- **Position（位置信息）**：让模型区分 Token 在序列中的位置和相对关系，否则“狗咬人”和“人咬狗”很难仅凭一袋 Token 区分。
- **Transformer Block（Transformer 计算层）**：反复处理整段 Token 表示的一组计算模块。Block 内部怎样交换和加工信息，会在后文逐层拆开。
- **Logits（未归一化分数）**：模型为词表中每个候选 Token 计算的原始分数。它们还不是概率。
- **Softmax（归一化指数函数）与 Probability Distribution（概率分布）**：Softmax 把一组 Logits 转成总和为 1 的候选概率，让系统可以比较下一个 Token 的可能性。
- **Sampling（采样）**：根据候选概率选择一个 Token。选择结果会接回上下文，成为下一轮计算的输入。
- **Autoregressive Generation（自回归生成）**：不断执行“预测一个 Token → 接回前缀 → 再预测”的生成方式。常见生成式 LLM 不是先在内部写好整篇答案再逐字播放。

有了这些词，可以先看一次完整调用的主链。图中故意不展开 Transformer Block 内部结构；Attention、Q/K/V、FFN 等词会在真正用到它们的章节再解释。

```text
人类文字
  ↓
Tokenizer（分词器）
  ↓
Token → Token ID
  ↓
Token Embedding + Position
  ↓
Transformer Block × N
  ↓
Logits
  ↓ Softmax
下一个 Token 的概率分布
  ↓ Sampling
新 Token
  ↓ 接回已有前缀
再来一轮
```

这张图只负责建立方向。接下来沿同一条链逐层展开：先解释 Transformer 为什么比循环网络更适合扩展，再进入文字表示、Block 内部计算、逐 Token 生成和本地推理。后面不再重复绘制第二张“完整主链”。

<a id="ch01-deep-read"></a>
## Transformer 内部究竟发生了什么

<a id="ch01-transformer-parallelism"></a>
### 3.1 Transformer 改变了什么：从顺序状态传递到大规模矩阵计算

#### 本节新词

- **RNN（Recurrent Neural Network，循环神经网络）**：按时间步传递状态的序列模型。当前时间步依赖前一时间步，因此长序列训练不容易充分转成大型并行矩阵计算。
- **LSTM（Long Short-Term Memory，长短期记忆网络）**：RNN 的一种改进结构，通过控制哪些信息保留或丢弃，缓解长距离信息传递困难，但计算仍保留明显的时间步依赖。
- **Hidden State（隐藏状态）**：循环模型在相邻时间步之间传递的内部表示，承载到当前位置为止的信息。
- **Parallelism（并行性）**：多个计算能否同时执行。Transformer 提高了序列内部的并行计算空间，但不表示生成时可以同时确定所有未来 Token。
- **Matrix（矩阵）**：按行列排列的二维数值结构。模型可以把许多位置的计算组织成大型矩阵运算，交给并行硬件处理。
- **Parameter（参数）**：训练过程中被调整、推理时被模型使用的数值。模型学到的能力主要编码在大量参数及其组合关系中。
- **Training（训练）**：用数据调整模型参数的过程；本节谈“并行训练”时，指一次同时计算序列中的多个位置。
- **Inference（推理）**：训练完成后，使用模型参数处理输入并产生结果的过程；生成阶段属于推理。

在 Transformer 之前，RNN 与 LSTM 常按时间步顺序传递隐藏状态：

```text
Token 1 → Token 2 → Token 3 → Token 4
   state     state     state
```

这种结构不是“完全不能并行”，但当前时间步依赖前一时间步，使长序列训练很难像大型矩阵乘法那样充分并行；远距离信息也需要跨多个状态传递。

Transformer 的关键变化是把大部分序列关系计算改写为矩阵形式，让不同位置直接建立信息读取关系。具体怎样读取，会在 §3.4 解释。应用层可以先记成：

> **RNN 更强地把顺序写进计算流程；Transformer 显式编码位置，并把大量序列计算变成适合并行硬件的矩阵运算。**

但不要把它进一步误写成“Transformer 没有顺序”。GPT 仍然限制每个位置可以读取哪些信息；生成时第 `t+1` 个 Token 也依赖已经生成到第 `t` 步的上下文。具体的限制机制留到 §3.9。

<a id="ch01-token-id-embedding"></a>
### 3.2 Token、Token ID、Token Embedding 是三个不同对象

#### 本节新词

- **Embedding Matrix（嵌入矩阵）**：模型训练得到的一张参数矩阵，每个 Token ID 对应其中一行。
- **Embedding Vector（嵌入向量）**：用 Token ID 从嵌入矩阵中取出的连续数值表示，后续 Transformer Block 会继续加工它。
- **Retrieval Embedding（检索嵌入）**：检索系统为查询或文档生成的向量，用于比较语义相似度。它与模型内部的 Token Embedding 处在不同系统层。

把“苹果发布了新品”交给模型时，Tokenizer 会先把文字切成 Token，再把每个 Token 换成词表中的 Token ID：

```text
原始文字
   ↓
Tokenizer
   ↓
Token
   ↓
Token ID
   ↓
Token Embedding
```

**Token ID（词元编号）**只是这个 Token 在 Vocabulary（词表）中的整数编号。编号 1234 本身没有“苹果”的连续语义几何。

**Token Embedding（Token 嵌入）**则是通过 Embedding Matrix（嵌入矩阵）把 Token ID 查成一组训练得到的连续数值：

```text
Token ID
   ↓  lookup
Embedding Matrix（模型参数）
   ↓
Embedding Vector
```

可以类比为：

```text
Token ID   ≈ 档案编号
Embedding  ≈ 由模型训练得到的基础数字表示
```

类比只帮助记忆，正式边界仍是：**ID 是离散索引，Embedding 是连续向量参数表示。** 后续 RAG 章的 Retrieval Embedding（检索嵌入）用途不同，不要因为都叫 Embedding 就混为同一层。

<a id="ch01-position"></a>
### 3.3 Position：并行计算不等于忽略顺序

#### 本节新词

- **Positional Information（位置信息）**：告诉模型 Token 在序列中的位置或相对关系，使相同 Token 在不同顺序下可以得到不同处理。
- **Learned Position（可学习位置表示）**：把位置本身作为训练参数学习。
- **Sinusoidal Position（正弦位置编码）**：用固定的正弦和余弦函数生成位置信息，不为每个位置单独学习参数。
- **RoPE（Rotary Position Embedding，旋转位置嵌入）**：通过旋转变换把相对位置信息带入不同位置之间的关系计算。本章只建立用途，不展开矩阵推导。

如果只给模型一袋 Token，而没有任何位置信息，那么“狗咬人”和“人咬狗”会缺少关键的顺序线索。

因此 Transformer 会把 Positional Information（位置信息）注入计算。应用层可以继续使用“座位号”类比：

```text
狗 @ position 1
咬 @ position 2
人 @ position 3
```

但正式理解要比“给每个 Token 加一个数字编号”更准确：不同架构可以使用 learned position、sinusoidal position、RoPE — Rotary Position Embedding（旋转位置嵌入）等不同机制，位置信息可能直接进入表示，也可能进入不同位置之间的关系计算。

当前阶段只需要知道：

> **Token 表示“是什么”，Position 机制表示“处在怎样的序列位置关系中”。**

本章不展开 RoPE 数学细节。

<a id="ch01-attention"></a>
<a id="ch01-qkv"></a>
### 3.4 Attention 与 Q/K/V：匹配之后再读取

#### 本节新词

- **Attention（注意力）**：当前位置根据匹配结果，从其他可见位置读取并组合信息的机制。它不是简单找“最重要的词”。
- **Query（查询向量，Q）**：当前位置用来表达“我现在需要匹配什么”的表示。
- **Key（键向量，K）**：每个可见位置用来参与匹配的表示。Query 与 Key 的关系决定读取权重。
- **Value（值向量，V）**：匹配完成后真正被加权汇总的内容表示。
- **Dot Product（点积）**：把 Query 和 Key 组合成匹配分数的一种运算。
- **Attention Weight（注意力权重）**：匹配分数经过缩放和 Softmax 后得到的读取比例，用来加权组合 Value。

有了这些对象，就能把 Attention 的一次读取说完整：

> **处理当前表示时，根据当前位置的 Query 与可见位置的 Key 计算匹配程度，再用得到的权重对 Value 做加权读取。**

于是一个 Token 的表示可以直接吸收其他相关位置的信息，而不需要像传统循环网络那样逐步传递状态。

可以用检索类比记忆：

```text
Q：我现在想找什么？
K：我和这个需求有多匹配？
V：如果关注我，我提供什么内容？
```

计算关系可以压缩成一行，不要求在本章推导：

```text
Attention(Q,K,V) = Softmax(QKᵀ / √dₖ) V
```

其中 Dot Product（点积）产生匹配分数；缩放项控制数值尺度；Softmax（归一化指数函数）把同一查询下的一组分数转成权重分布；最后按权重组合 Value。

因此“Q/K 负责匹配、V 负责提供被读取的信息”比“Q 找答案、K 是答案、V 是结果”更不容易误导。

<a id="ch01-weights-vs-qkv"></a>
### 3.5 Wq / Wk / Wv 是参数，Q / K / V 是动态结果

#### 本节新词

- **Projection（投影）**：用一组训练得到的权重把当前表示转换到另一种表示空间。
- **Wq / Wk / Wv（查询、键、值投影权重）**：模型训练得到的参数，分别负责计算本次输入的 Q、K、V。普通推理时它们通常保持不变。
- **Dynamic Representation（动态表示）**：由当前输入和上下文现场计算出的中间结果。Q/K/V 属于动态表示，不属于固定模型参数。

这是最容易混的一层：

```text
当前 hidden representation
   ├─ × Wq → Q
   ├─ × Wk → K
   └─ × Wv → V
```

**Wq / Wk / Wv** 是训练过程中学到的 Projection Weights（投影权重），属于模型参数；普通推理时通常固定。

**Q / K / V** 是本次输入在当前层、当前位置经过这些参数投影后得到的中间表示，会随输入和上下文改变。

一句边界：

> **参数定义“怎么投影”；Q/K/V 是“这一次投影出了什么”。**

<a id="ch01-multi-head"></a>
### 3.6 Multi-Head Attention：在多个子空间中并行建模关系

#### 本节新词

- **Attention Head（注意力头）**：在自己的一组投影子空间中计算 Q/K/V 和 Attention 的分支。
- **Multi-Head Attention（多头注意力）**：并行计算多个 Attention Head，再合并结果，使模型可以学习多组不同的关系表示。
- **Learned Subspace（学习得到的参数子空间）**：由训练形成的投影空间。它可能学到不同关系，但不能预先固定命名为“语法头”或“情绪头”。
- **`q_proj / k_proj / v_proj`**：模型实现或配置中常见的投影层名称，通常一次计算出多个 Head 所需的 Q/K/V，再进行拆分。

Multi-Head Attention（多头注意力）把表示投影到多个 Head（注意力头）对应的参数子空间中，分别计算注意力，再合并结果：

```text
                    同一批 Token 表示
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
          Head 1          Head 2          Head 3 ...
         Q1 K1 V1        Q2 K2 V2        Q3 K3 V3
            │              │              │
         Attention       Attention       Attention
            └──────────────┼──────────────┘
                           ▼
                        合并 / 投影
```

“多个观察角度”是好类比，但不要把它误解成工程师提前指定“Head 1 看主谓、Head 2 看情绪”。这些子空间是训练学出来的，具体语义不保证可被人类这样固定命名。

实现上常用大的 `q_proj / k_proj / v_proj` 一次算出多个 Head 的投影，再按 Head 重新整理并拆开，而不是为每个 Head 写三套独立函数。

<a id="ch01-attention-vs-ffn"></a>
### 3.7 Attention 与 FFN / MLP：跨位置交流与逐位置加工

#### 本节新词

- **FFN（Feed-Forward Network，前馈神经网络）**：对每个位置分别应用同一组前馈参数，对已经汇入上下文信息的表示继续做非线性变换。
- **MLP（Multi-Layer Perceptron，多层感知机）**：现代 LLM 中常用来指 Block 内承担前馈加工的网络部分。这里与 FFN 指向相近的计算角色。
- **Nonlinear Transformation（非线性变换）**：不是简单按比例缩放输入，使网络可以表达更复杂的特征组合。

Attention 把其他位置的信息带回来之后，FFN / MLP 还要继续加工当前位置的表示。

可以类比为：

```text
Attention：和其他 Token 交换信息
FFN / MLP：把当前 Token 的新表示继续做非线性加工
```

更正式地说：

- Attention 让一个位置读取其他可见位置的信息；
- FFN/MLP 对每个位置独立应用同一组前馈参数，扩展并重组特征；
- 两者承担不同计算角色，不能把 Transformer 简化成“只有 Attention”。

<a id="ch01-residual-norm-block"></a>
### 3.8 Residual、LayerNorm 与 Transformer Block

#### 本节新词

- **Residual Connection（残差连接）**：把子层输入直接加到子层输出上，让深层网络可以在已有表示之上学习增量变化。
- **Layer Normalization / LayerNorm（层归一化）**：调整单个表示内部的数值尺度，帮助深层网络保持更稳定的训练和推理行为。
- **Pre-Norm / Post-Norm（前归一化／后归一化）**：Normalization 放在子层之前或之后的不同结构安排。本章不要求记具体架构采用哪一种。
- **Contextual Representation（上下文化表示）**：Token 经过多层计算后形成的表示，会随周围 Token 改变，不再只是最初的 Token Embedding。

Residual Connection（残差连接）提供跨子层的捷径连接：

```text
x ────────────────────────┐
│                         │
└→ sublayer(x) → change ──┼→ x + change
```

“保留旧信息”可以作为直觉，但更完整的工程作用是：让深层网络能够在已有表示上学习增量变化，并改善深层优化时的信息与梯度传递。

Layer Normalization（层归一化）用于控制每个表示内部的数值尺度，帮助训练与推理中的数值行为更稳定。现代架构存在 Pre-Norm、Post-Norm 等不同排布，本章不要求背具体顺序。

应用层骨架只需要稳定记住：

```text
Transformer Block
≈ Attention
+ FFN / MLP
+ Residual Connection
+ Normalization
```

经过多层 Block 后，同一个初始 Token Embedding 会得到依赖上下文的 Contextual Representation（上下文化表示）。“苹果”在“吃苹果”和“苹果发布新品”中，经过多层计算后的表示会不同。

<a id="ch01-causal-mask"></a>
### 3.9 Causal Mask：生成式 Decoder 如何阻止训练时偷看未来

#### 本节新词

- **Decoder-only Model（仅解码器模型）**：只使用 Transformer Decoder 路线进行生成的模型类型，GPT 是代表性路线。
- **Next-Token Prediction（下一 Token 预测）**：根据当前可见前缀预测紧接着出现的 Token，是 GPT 类模型常用的训练和生成目标。
- **Causal Mask（因果遮罩）**：限制每个位置只能读取当前位置及之前的位置，防止训练时利用未来 Token。
- **Causal Attention（因果注意力）**：应用了因果可见性约束的 Attention。计算可以并行执行，但信息不能越过遮罩读取未来。

GPT 类 Decoder-only 模型进行 Next-Token Prediction（下一 Token 预测）。训练时完整序列通常已经在输入张量中，因此必须限制每个位置只能读取当前位置及其之前的位置。

Causal Mask（因果遮罩）可以表示为：

```text
        我  今天  吃  了  苹果
我      ✓   ×    ×   ×    ×
今天    ✓   ✓    ×   ×    ×
吃      ✓   ✓    ✓   ×    ×
了      ✓   ✓    ✓   ✓    ×
苹果    ✓   ✓    ✓   ✓    ✓
```

这保证训练目标与生成方向一致。推理解码时未来 Token 本来就还不存在，但同样的 causal attention 约束定义了模型只能使用已生成前缀。

不要把“Transformer 可以并行训练很多位置”理解成“每个位置能看未来答案”。**计算可以并行，信息可见性仍受 Mask 约束。**

<a id="ch01-autoregressive-output"></a>
### 3.10 从最终表示到下一个 Token：Logits → 概率 → 采样

#### 本节新词

- **Final Hidden Representation（最终隐藏表示）**：最后一层 Transformer 为当前位置计算出的上下文化表示。
- **Output Projection（输出投影）**：把最终隐藏表示转换成词表维度上的 Logits，使每个候选 Token 都得到一个分数。
- **Append（接回前缀）**：把采样得到的新 Token 加到已有序列末尾，让下一轮预测能看见刚才的结果。

模型最终不会直接吐出一句字符串。它先为 Vocabulary 中每个候选 Token 计算 Logits（未归一化分数）：

```text
final hidden representation
        ↓
output projection
        ↓
Logits
        ↓
Softmax
        ↓
Token probability distribution
        ↓
Sampling
        ↓
next Token
```

Sampling（采样）选出的 Token 会加入当前前缀，再触发下一步预测：

```text
Prompt
  ↓
Token 1
  ↓ append
Prompt + Token 1
  ↓
Token 2
  ↓ append
...
```

这就是 Autoregressive Generation（自回归生成）：**每一步根据当前前缀预测一个新的 Token，再把结果变成下一步输入的一部分。**

因此常见生成式 LLM 并不是先在内部一次性写好完整答案，再逐字把已有答案播放出来。

<a id="ch01-sampling-controls"></a>
### 3.11 Temperature / Top-P / Top-K：控制采样，不控制“是否思考”

#### 本节新词

- **Temperature（温度）**：调节采样分布集中或分散程度的参数。它影响输出随机性，不直接增加模型的推理深度。
- **Top-K Sampling（Top-K 采样）**：只保留概率最高的 K 个候选 Token，再从中采样。
- **Top-P / Nucleus Sampling（Top-P／核采样）**：按概率从高到低累积，保留累计概率达到阈值的一组候选 Token。
- **Reasoning / Inference-time Compute（推理／推理时计算）**：一次调用中用于分析和求解的计算过程，与采样参数属于不同层次。

Temperature（温度）改变 logits 转成采样分布后的尖锐程度；更低通常更集中、更高通常更分散，但它不是“正确性开关”。

Top-P / Nucleus Sampling（核采样）按累计概率质量保留候选集合；Top-K Sampling（Top-K 采样）只保留概率最高的 K 个候选。它们常与 Temperature 组合使用。

```text
财务抽取 / 结构化任务
→ 往往希望更保守、更可复现

创意写作 / 发散候选
→ 可以允许更多采样多样性
```

关键边界：

> **稳定 ≠ 正确。** 如果模型已经把错误 Token 排在最高概率附近，降低 Temperature 只可能让错误更稳定。

> **Temperature ≠ Reasoning（推理）深度。** Temperature 属于 Sampling；Reasoning / inference-time compute 在 Reasoning 章单独解释。

<a id="ch01-kv-cache"></a>
### 3.12 KV Cache：缓存历史 K/V，不是长期记忆

#### 本节新词

- **KV Cache（键值缓存）**：保存历史 Token 在各层已经计算出的 Key 和 Value，避免生成下一个 Token 时全部重算。
- **Conversation History（对话历史）**：应用保存的过去消息记录，可能在后续请求中重新装入 Context；它不属于模型内部 KV Cache。
- **Agent Memory（Agent 记忆）**：由 Agent 系统治理、可跨步骤或任务复用的信息。它需要选择、持久化和读取策略，不是推理缓存。
- **RAG Knowledge Base（检索增强生成知识库）**：供检索系统查询的外部知识来源，也不会因为进入一次模型调用就变成 KV Cache。

自回归生成到第 `t` 步时，过去位置在各层已经计算出的 K/V 可以缓存。下一步只需为新增 Token 计算新的表示，再让它读取历史缓存：

```text
Token 1 → K1 / V1 ─┐
Token 2 → K2 / V2 ─┼→ KV Cache
Token 3 → K3 / V3 ─┘
                       ↑
new Token → new K/V ──┘
```

Key-Value Cache（键值缓存）的价值是减少解码过程中对历史 K/V 的重复计算；随着可缓存上下文增长，它也会消耗更多内存。

必须保持命名边界：

```text
KV Cache
≠ Conversation History
≠ Agent Memory
≠ RAG Knowledge Base
```

Agent Memory 留到 State/Context/Memory 章完整解释；这里先把它与 KV Cache 分开。

<a id="ch01-gpu-transformer"></a>
### 3.13 Transformer 为什么与 GPU 高度契合

#### 本节新词

- **CPU（Central Processing Unit，中央处理器）**：擅长复杂控制和通用低延迟任务，通常由较少的强核心组成。
- **GPU（Graphics Processing Unit，图形处理器）**：拥有大量适合执行相似数值操作的并行计算单元，常用于矩阵和张量计算。
- **Tensor（张量）**：多维数值数组。Transformer 的表示、参数和中间结果通常以 Tensor 组织。
- **Prompt（提示词）**：一次模型调用中交给模型处理的输入文本或指令。
- **Prefill（提示词预填充）**：生成开始前，对整段 Prompt 进行计算并建立初始缓存的阶段。
- **Decoding（解码）**：Prefill 之后逐个生成新 Token 的阶段。它与 Prefill 具有不同的计算特征。

CPU 与 GPU 都能做并行计算，但优化目标不同：CPU 更强调少量强核心、复杂控制与低延迟通用工作；GPU 更擅长大量相似数值操作并行执行。

Transformer 的 Attention、Projection、FFN 等核心路径包含大量矩阵乘法和张量操作，因此与 GPU 的并行计算模型高度契合。

需要保留两个限定：

1. 这种并行优势在训练与 Prefill 阶段尤其明显；
2. 自回归生成跨 Token 的时间步仍有顺序依赖，只是每一步内部仍会大量使用 GPU 并行矩阵计算。

因此 Transformer 的扩展既受算法设计推动，也受 GPU、内存系统和软件栈演进推动。

<a id="ch01-apple-silicon-local-inference"></a>
### 3.14 当前事实 · 2026-09-03｜Apple Silicon 本地推理不是“CPU 会 AI”

#### 本节新词

- **Apple Silicon**：Apple 自研的芯片系列，把 CPU、GPU 和统一内存等组件集成在同一芯片系统中。
- **Unified Memory（统一内存）**：CPU 与 GPU 可以访问同一内存池的架构，减少设备之间显式搬运数据的需要。
- **MLX**：面向 Apple silicon 的机器学习数组框架，支持在 CPU 和 GPU 上运行操作，并采用统一内存模型。
- **Metal**：Apple 提供的图形与计算编程接口。llama.cpp 等本地推理软件可以通过 Metal 后端使用 GPU。
- **llama.cpp**：面向本地 LLM 推理的开源实现，支持多种硬件后端和量化模型。

这一节记录会随硬件和软件变化的当前事实，不把它混进 Transformer 的稳定定义。

MLX 官方文档说明，MLX 数组位于统一内存中，支持设备可以直接访问同一内存池；MLX 官方仓库列出的当前设备类型包括 CPU 和 GPU。`llama.cpp` 的构建文档则明确说明，macOS 默认启用 Metal，使用 Metal 会让计算运行在 GPU 上。

所以更稳的应用层表述是：

> **Apple Silicon 本地 LLM 推理表现来自 GPU 计算、统一内存容量与读写速度、Metal/MLX/llama.cpp 等执行后端，以及模型大小和量化方式等共同作用；不能简化成“Apple CPU 特别会跑 AI”。**

这一判断所依据的硬件代际和软件能力会变化，阅读时应结合文末来源重新核验；但“不要把系统能力归因给单一 CPU”这一工程边界不依赖某个具体芯片型号。

<a id="ch01-quantization"></a>
### 3.15 Quantization：本地模型为什么常见 Q4 / Q8

#### 本节新词

- **Quantization（量化）**：用更低位宽的数值近似表示模型权重或部分计算，减少模型占用和内存带宽压力。
- **Weight Quantization（权重量化）**：主要降低模型权重存储精度，是本地 LLM 文件中最常见的量化场景之一。
- **FP16 / FP32（16 位／32 位浮点数）**：两种常见的浮点数格式。FP16 通常比 FP32 占用更少空间，但能够表达的数值精度和范围也不同。
- **Q8 / Q4**：大致表示 8 位或 4 位级别的量化权重，但具体格式还会规定分块、缩放和混合精度方式。
- **`Q4_K_M / Q8_0`**：具体量化格式名称。这里的字母 Q 指 Quantization，与 Attention 中的 Query 无关。

Quantization（量化）是用更低精度的数值表示模型参数或计算中的部分张量，以降低存储与内存/带宽压力并提升某些硬件上的执行效率。对于本章常见的本地 LLM 语境，重点理解 Weight Quantization（权重量化）。

粗略的位宽直觉：

```text
FP16 ≈ 16-bit floating point
Q8   ≈ 8-bit 级权重表示
Q4   ≈ 4-bit 级权重表示
```

真实格式还会规定权重怎样分组、怎样保存缩放参数，以及哪些部分保留更高精度。因此不能简单把“70B × 4 位”当成全部运行内存；这里只建立边界。

这里最容易混淆的是字母 Q：

```text
Attention 中的 Q
= Query

Q4_K_M / Q8_0 中的 Q
= Quantization
```

两者没有同一语义。

<a id="ch01-training-vs-inference"></a>
### 3.16 Training 与 Inference：一个更新参数，一个使用参数

#### 本节新词

- **Forward Pass（前向计算）**：输入沿模型计算图向前产生预测的过程，训练和推理都会执行。
- **Target（目标值）与 Loss（损失）**：Target 是训练希望模型得到的结果，Loss 衡量当前预测与目标之间的差距。
- **Backpropagation（反向传播）与 Gradient（梯度）**：根据 Loss 计算各参数应该怎样变化。
- **Optimizer（优化器）**：根据梯度更新模型参数的算法。
- **Buffer（运行时缓冲区）**：推理过程中保存临时数据的内存区域。Buffer 或 KV Cache 变化，不表示模型参数被重新训练。

Training（训练）的典型学习环路是：

```text
训练样本
  ↓
Forward Pass（前向计算）
  ↓
预测
  ↓
与 Target 比较
  ↓
Loss（损失）
  ↓
Backpropagation（反向传播）
  ↓
Gradient（梯度）
  ↓
Optimizer（优化器）
  ↓
更新参数
```

会被更新的可能包括 Embedding、Attention 投影、FFN、输出层等大量模型参数。

Inference（推理）则使用已经训练好的权重进行前向计算和生成：

```text
Prompt
  ↓
使用固定模型权重计算
  ↓
预测下一个 Token
  ↓
持续自回归生成
```

普通推理过程中 KV Cache、运行时 buffer 等会变化，但**模型权重本身通常不因一次普通请求而更新**。

因此：

> **Training = 通过优化过程学习并修改参数；ordinary Inference = 使用参数完成预测。**

“70B 参数”也不是“模型里存了 700 亿句话”，而是指数量级为 700 亿的可训练数值参数。

<a id="ch01-config-and-learning-boundary"></a>
### 3.17 看到模型配置时，应该把它放回哪一层

#### 本节新词

- **Model Configuration（模型配置）**：描述模型结构、容量或推理行为的一组字段。字段名帮助定位概念，但不能代替对机制的理解。
- **Context Window（上下文窗口）**：一次模型调用能够处理的 Token 范围约束。它属于模型容量边界，不等于运行系统为任务装配的全部上下文。
- **MQA / GQA（Multi-Query / Grouped-Query Attention，多查询／分组查询注意力）**：让多个 Query Head 共享或分组共享较少的 K/V Head，以减少 KV Cache 和推理开销的注意力变体。本章只要求识别配置含义。
- **FlashAttention**：减少 Attention 计算中 GPU 内存读写开销的一类优化实现，不改变本章介绍的 Q/K/V 基本语义。
- **CUDA Kernel（CUDA 内核）**：运行在 NVIDIA GPU 上的底层计算程序。它属于实现细节，不是新的模型概念。
- **Tensor Core（张量核心）**：部分 GPU 中专门加速矩阵运算的硬件单元。
- **Distributed Training（分布式训练）**：把训练计算和数据分配到多个设备或节点上协同完成。

下面的表不再重复定义术语，只负责把配置字段带回前文已经解释过的机制：

| 看到这个配置 | 回到哪里理解 |
|---|---|
| `context_length` / `context_window` | Context Window：本节；与 Runtime Context 的边界见后续 State/Context/Memory 章 |
| `num_attention_heads` | [§3.6 Multi-Head Attention](#ch01-multi-head) |
| `num_key_value_heads` | 本节的 MQA/GQA，以及 [§3.12 KV Cache](#ch01-kv-cache) |
| `q_proj / k_proj / v_proj` | [§3.5 投影参数与动态 Q/K/V](#ch01-weights-vs-qkv) |
| `kv_cache` | [§3.12 KV Cache](#ch01-kv-cache) |
| `temperature`、`top_p`、`top_k` | [§3.11 采样控制](#ch01-sampling-controls) |
| `Q4_K_M / Q8_0` | [§3.15 Quantization](#ch01-quantization) |

当前应用层学习到这里就够了。暂不把以下内容当必修：

- Softmax / Backpropagation 的微积分推导；
- RoPE 的旋转矩阵细节；
- FlashAttention 与 CUDA Kernel 的实现；
- Tensor Core 的使用方式和分布式训练实现；
- GQA/MQA 的公式和内核细节。

这不是说它们“不重要”，而是把深度放在正确阶段：**先能把模型服务参数、本地推理参数和后续 RAG/Agent 概念放进一张准确的系统图，再按需要进入模型底层。**

<a id="ch01-boundary-map"></a>
<a id="ch01-provisional-crossrefs"></a>
## 这套底座怎样通向后续章节

本章只保留与相邻概念的边界，不复制其他章节的完整定义：

| 本章出现的邻近概念 | 负责章节 | 连接目标 | 本章只保留什么 |
|---|---|---|---|
| Retrieval Embedding / RAG | RAG 章 | [RAG 章 Retrieval, RAG & Knowledge Systems](../02_知识与能力/01_模型怎样使用外部知识.md#ch06-embedding-boundary) | Token Embedding 与 Retrieval Embedding 的命名边界 |
| Reasoning / inference-time compute | Reasoning 章 | [Reasoning 章 Reasoning & Inference-time Compute](05_推理模型改变了什么.md#ch05-reasoning-definition) | Temperature ≠ Reasoning |
| Agent Memory / Runtime Context | State/Context/Memory 章 | [State/Context/Memory 章 State, Context & Memory](../04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md#ch11-information-model) | KV Cache ≠ Memory；Context Window ≠ Runtime Context |

这些连接让读者可以沿着 Token / Context 的模型侧边界继续进入知识系统、Reasoning 与 Runtime。

<a id="ch01-review-self-check"></a>
## 用这些问题检验是否真正理解

不用背答案，能顺畅解释下面问题就说明本章主干已经建立：

1. 为什么说 Transformer 更适合 GPU 并行，但不能说“Transformer 没有顺序”？
2. Token、Token ID、Token Embedding 三者分别是什么？
3. Position 机制解决什么问题？为什么“座位号”只是类比？
4. Attention 的“匹配”和“读取”分别由哪些对象承担？
5. Wq/Wk/Wv 与 Q/K/V 为什么不能混？
6. Multi-Head Attention 为什么不等于“工程师提前规定多个语义角色”？
7. Attention 与 FFN/MLP 的职责差异是什么？
8. Residual / LayerNorm 为什么让深层 Block 更可训练、更稳定？
9. Causal Mask 如何与并行训练同时成立？
10. `logits → Softmax → sampling → append` 为什么构成 Autoregressive Generation？
11. Temperature / Top-P / Top-K 分别控制什么？为什么稳定不等于正确？
12. KV Cache 为什么不是 Memory？
13. Apple Silicon 本地推理为什么不能简化成“CPU 会 AI”？
14. Quantization 的 Q 与 Attention Query 的 Q 有什么关系？
15. Training 与 ordinary Inference 的关键分界是什么？

<a id="ch01-current-fact-sources"></a>
## 当前事实来源

本节在 2026-09-03 使用以下官方或上游来源核验：

- [MLX Unified Memory 文档](https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html)：说明 MLX 数组位于共享内存中，支持设备无需显式复制即可访问。
- [MLX 官方仓库](https://github.com/ml-explore/mlx)：说明 MLX 面向 Apple silicon，当前支持 CPU/GPU 设备并采用统一内存模型。
- [llama.cpp 构建文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#metal-build)：说明 macOS 默认启用 Metal，使用 Metal 会让计算运行在 GPU 上。

这些来源只支撑当前实现/硬件事实，不负责定义 Attention、Autoregressive Generation、Training/Inference 等稳定原理。

<a id="ch01-close"></a>
下一章从这套计算底座继续往前：Transformer 同时支持不同建模路线，BERT 与 GPT 选择了不同方向；BERT/GPT 章会解释两条路线为什么分化，以及生成式路线怎样成为通用交互底座。

## 学习导航

[← 上一章](../00_从Transformer到Agent平台.md) · [新版目录](../README.md) · [下一章 →](02_BERT与GPT为什么走向不同方向.md)
