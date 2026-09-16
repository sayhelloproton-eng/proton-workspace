# BERT 与 GPT 为什么走向不同方向

> 唯一职责：解释 Transformer 之后“读取完整输入形成表示”和“根据前缀持续生成”为什么走成两条重要路线。
> 读完要能回答：BERT 与 GPT 为什么形成不同工程优势，以及通用模型怎样在不重新训练的情况下临时切换任务？
> 前置：已经理解 Transformer 与逐 Token 生成。
> 本章只建立两条模型路线和调用时临时适配任务的历史桥梁；训练规模、后训练和系统级上下文管理留到后续章节。

<a id="ch02-30s-core"></a>
<a id="ch02-3m-mental-model"></a>
## 从共同底座走向两种产品需求

同一个产品团队很容易同时遇到两类任务：搜索服务要判断查询与文档是否匹配，对话入口却要根据用户已经说出的内容继续生成回答。Transformer 给了两边共同的计算底座，但“读完整材料后形成表示”和“根据前缀持续生成”会把模型推向不同的结构与训练目标。

### 本节新词

- **Encoder（编码器）**：在本章场景里，指更偏向读取完整输入并形成上下文化表示的 Transformer 路线，系统通常把这种表示交给分类、匹配或检索组件使用。它不等于“只能理解、不能参与生成系统”。
- **Decoder（解码器）**：在本章场景里，指按照生成约束处理已有前缀、继续预测后续 Token 的 Transformer 路线。GPT 主要沿这条路线发展；它和“把加密数据解码”里的 Decoder 不是一回事。
- **Encoder-oriented / Decoder-oriented（偏编码器／偏解码器路线）**：强调一类模型主要优化的使用接口，不表示系统只能由单一结构组成，也不等于“理解路线／不理解路线”的能力高低判断。

先只看这次分叉，不提前把后面的 ICL、Post-training 和 RAG 都塞进总览图：

```text
                         Transformer
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
        Encoder-oriented route     Decoder/autoregressive route
               BERT                       GPT
                 │                         │
       完整上下文 → 表示/判断        已有前缀 → 继续生成
                 │                         │
   分类 / 匹配 / 检索            写作 / 问答 / 翻译 / 代码
```

这张图先回答“为什么会分叉”。BERT 和 GPT 后来谁更适合什么任务，要沿两条路线分别看；GPT-3 带来的 In-context Learning 则等走到 §3.5 再引入。

<a id="ch02-15m-mainline"></a>
<a id="ch02-deep-read"></a>
## BERT 与 GPT 怎样走出不同路径

<a id="ch02-transformer-split"></a>
### 3.1 同一个 Transformer，为什么会长出不同路线

Transformer 章已经建立了共同计算骨架。原始 Transformer 同时包含 Encoder（编码器）和 Decoder（解码器）组件，后续语言模型并没有只沿一条路发展。

应用层可以把分叉看成两个不同问题：

```text
问题 A：给我一段完整输入，我怎样形成高质量表示并判断它？
→ Encoder-oriented route

问题 B：给我一个已有前缀，我怎样持续预测下一个 Token？
→ Autoregressive Decoder route
```

这不是“理解模型 vs 不理解模型”的绝对二分。生成模型当然也会形成复杂表示，Encoder 也可以参与生成系统。这里说的是**主要训练/使用接口所形成的工程优势**。

<a id="ch02-bert"></a>
### 3.2 BERT：Bidirectional Encoder Representations from Transformers（Transformer 双向编码表示）

#### 本节新词

- **BERT — Bidirectional Encoder Representations from Transformers（基于 Transformer 的双向编码表示）**：这里指以 Encoder 为核心、利用左右上下文学习语言表示的预训练模型路线。它主要提供表示与判断能力，不要把“BERT”直接当成搜索系统里的某个固定组件名。
- **Bidirectional（双向）**：训练表示某个位置时可以利用它左右两侧的信息。它描述信息可见性，不是“把一句话正着读一遍、反着再读一遍”。
- **MLM — Masked Language Modeling（掩码语言建模）**：遮住输入中的一部分 Token，再根据可见上下文恢复它们的预训练目标；它帮助 Encoder 学习上下文化表示，但不是从左到右持续生成文本的接口。
- **NER — Named Entity Recognition（命名实体识别）**：从文本中识别人名、组织、地点等实体类别的任务，属于理解／抽取层；不要和生成一段实体描述混为一类任务。

BERT 的核心路线是利用 Encoder 构造双向上下文化表示：一个位置的表示可以同时利用左侧和右侧上下文。

```text
左侧 Context  ← 当前 Token →  右侧 Context
                     │
                     ▼
             contextual representation
```

这种“双向”并不是推理时把一句话来回读几遍，而是来自预训练任务。BERT 会把输入中的一部分 Token 遮住，再根据左右两侧上下文恢复它们；这类目标通常称为 **Masked Language Modeling（掩码语言建模，MLM）**。例如把“退款将在三个工作日到账”中的“退款”遮住，模型可以同时利用后面的“到账”和前后的句法关系判断缺失内容。它因此很适合学习整段输入的表示，但 MLM 本身并不是从左到右持续生成新文本的接口。

这种表示特别适合“输入基本完整、输出是判断或表示”的任务，例如：

- Text Classification（文本分类）；
- Named Entity Recognition（命名实体识别，NER）；
- Semantic Matching（语义匹配）；
- Search / Retrieval 中的表示与匹配；
- 检索系统中的候选精排；
- Extractive / understanding-oriented tasks（抽取 / 理解型任务）。

因此把 BERT 记成“读完整材料后做表示与判断”比“BERT 只会分类”更准确。

<a id="ch02-bert-not-failed"></a>
### 3.3 BERT 没有失败：主角变化不等于基础设施消失

生成式 LLM 成为通用用户入口后，很容易形成错误历史叙事：

```text
BERT 被 GPT 淘汰了
```

更准确的是：

```text
通用自然语言交互主干
→ 越来越偏 GPT-style generative model

理解 / 表示 / 搜索 / 分类 / Rerank 基础能力
→ Encoder-style model 继续大量存在
```

所以“GPT 成为通用生成主干”与“BERT-style Encoder 仍有重要系统价值”完全可以同时成立。

这也解释了后续 RAG 章中的一个边界：**检索系统里的候选精排责任不等于 BERT 本身；BERT-style Encoder 可以成为实现这项责任的模型路线之一。** 具体组件名称等走到 §3.11 再引入。

<a id="ch02-gpt-route"></a>
### 3.4 GPT：把许多任务统一成 Autoregressive Generation

#### 本节新词

- **GPT — Generative Pre-trained Transformer（生成式预训练 Transformer）**：这里指沿 Decoder / 自回归路线扩展的模型家族，核心使用接口是根据已有前缀继续生成。它是模型路线，不等于 ChatGPT 这个产品。
- **NLP — Natural Language Processing（自然语言处理）**：让计算机处理文本和语言任务的领域总称，分类、翻译、问答、实体识别都属于 NLP；它不是某一种模型架构。
- **Next-token Objective（下一 Token 预测目标）**：训练模型根据当前可见前缀预测紧接着出现的 Token。它把许多任务统一到同一种生成接口，但不表示所有业务输出都应该使用自由文本。

GPT 主要沿 Decoder / Autoregressive Generation（自回归生成）路线发展。Transformer 章已经解释完整机制，这里只保留历史功能意义：

```text
已有前缀
  ↓
预测 next token
  ↓
append
  ↓
继续预测
```

当模型规模、数据与训练质量不断提高时，很多传统 NLP 任务都可以被表达成“生成合适文本”：

```text
翻译     → 生成目标语言
摘要     → 生成压缩后的文本
问答     → 生成答案
分类     → 生成标签/结构结果
代码     → 生成代码 Token
对话     → 生成下一轮 Assistant 内容
```

这并不是说所有任务都应该强行改成自由文本生成，而是说明统一的 next-token objective（下一 Token 目标）提供了一个极其通用的能力接口。

GPT-1 / GPT-2 / GPT-3 的历史细节与 Scaling 由 Scaling 章 维护。本章只保留阶段性桥梁：GPT-1 证明预训练迁移路线；GPT-2 展示统一生成目标的任务广度；GPT-3 把 ICL 体验放大到应用开发者能够直接使用的程度。

<a id="ch02-icl"></a>
### 3.5 In-context Learning：当前 Context 改了，模型参数没改

#### 本节新词

- **ICL — In-context Learning（上下文学习）**：模型在一次调用中根据任务说明、规则或示例临时推断任务模式，直接用已有参数完成任务。它发生在推理时，不会因为这次示例自动修改模型权重。
- **Context（上下文）**：这里专指这一次模型调用真正能够看到的输入工作集，包括任务说明、示例和当前输入；后面的 Runtime 章节还会讨论系统怎样组装 Context，不要把它等同于长期 Memory。

In-context Learning（上下文学习，ICL）指模型根据**当前输入上下文中的任务描述、规则或示例**，临时推断当前任务模式并完成任务，而不进行参数更新。

```text
Task instruction
+ Examples
+ Current input
      ↓
一次模型调用的 Context
      ↓
已有模型参数进行推理/生成
      ↓
Output
```

关键边界是：

```text
Context changed = YES
Parameter update = NO
```

例如：

```text
你好 → Hello
谢谢 → Thank you
再见 → Goodbye
苹果 → ?
```

模型从当前示例推断“把中文翻译成英文”的模式。它没有因为这四行内容重新做一次训练，也不会因此自动把新规律永久写回权重。

<a id="ch02-zero-one-few-shot"></a>
### 3.6 Zero-shot、One-shot、Few-shot：示例数量，而不是三种训练算法

#### 本节新词

- **Zero-shot（零样本）**：当前调用不给任务示例，只给任务说明就要求模型作答。这里的“零样本”描述 ICL 输入形式，不表示模型训练阶段从未见过类似数据。
- **One-shot（单样本）**：当前 Context 放一个示范样例，让模型据此推断任务形式；参数仍然不更新。
- **Few-shot（少样本）**：当前 Context 放少量代表性示范。它最容易和“用少量样本做 Fine-tuning”混淆，区别在于示例是否进入训练并更新参数。

这三个词描述当前任务提示中示例的数量配置：

| Mode | 中文理解 | 当前 Context 中典型形式 |
|---|---|---|
| Zero-shot（零样本） | 不给示范 | 只描述任务和要求 |
| One-shot（单样本） | 给一个示范 | 一个 input → output example |
| Few-shot（少样本） | 给少量示范 | 多个代表性 examples |

它们都可以发生在普通推理阶段，不要求重新训练参数。

因此不要写成：

```text
Few-shot = 小规模 Fine-tuning
```

这是错误命名边界。Few-shot ICL 的“样本”位于 Context；Fine-tuning 的样本进入训练过程并更新模型参数。

<a id="ch02-icl-why-important"></a>
### 3.7 ICL 为什么改变了应用开发方式

传统专项模型开发常见流程是：

```text
Task
→ collect labeled data
→ train / fine-tune
→ deploy task-specific model
```

ICL 让一部分任务可以先尝试：

```text
General model
→ instruction + examples
→ task result
```

这大幅降低了“验证一个新任务是否值得做”的门槛，也使同一个通用模型可以快速切换任务形式。

但 ICL 并没有取消训练、评估或系统工程。它只是增加了一种**调用时适配**方式。任务需要长期稳定行为时，仍可能进入 Post-training；需要外部知识时进入 RAG；需要现实动作时进入 Tool。后续章节会分别解释这些机制。

<a id="ch02-prompt-engineering"></a>
### 3.8 Prompt Engineering：ICL 的应用工程外显

#### 本节新词

- **Prompt Engineering（提示词工程）**：通过组织 Instruction、Examples、格式和约束，让模型在当前调用里更准确理解任务的方法。它优化的是调用输入，不直接改变模型参数。
- **Instruction（指令）**：告诉模型当前要完成什么、遵守什么要求的输入内容；它可以是 Prompt 的一部分，也可能由系统层自动注入。
- **Context Engineering（上下文工程）**：决定一次调用应该装入哪些信息、怎样排序和压缩的更上位工程问题。Prompt 是其中一部分，RAG Evidence、Tool Result、历史和 State 也可能进入 Context。

GPT-3 时代开发者强烈感受到：只改变输入中的 Instruction（指令）、Examples（示例）和格式，就可能显著改变模型结果。于是 Prompt Engineering（提示词工程）迅速成为重要实践。

可以把它理解成：

```text
ICL 是模型在当前 Context 中临时适配的能力现象
↓
Prompt Engineering 是开发者利用这种能力组织任务输入的方法
```

但是现代 AI 系统中，模型一次调用看到的内容远不止 Prompt 文案。还可能包括 State、Memory、RAG evidence、Tool result、system instruction、structured constraints 等。

因此这里先保留历史关系：**Prompt Engineering 从 ICL 体验中爆发；General Context Engineering（上下文工程）留到 State/Context/Memory 章。**

<a id="ch02-cross-owner-boundaries"></a>
### 3.9 ICL、Post-training、RAG、Tool 不在同一层

#### 本节新词

- **Post-training（后训练）**：基础预训练之后，为指令遵循、偏好或特定行为继续训练模型的阶段；它会改变模型参数，和只调整当前 Context 的 ICL 不在一层。
- **RAG — Retrieval-Augmented Generation（检索增强生成）**：在调用模型前从外部知识源检索证据并装入 Context，解决“这次需要参数外资料”的问题；它不是一种 Fine-tuning。
- **Tool（工具）**：模型或 Agent 可以请求调用的外部能力，例如查订单、执行代码或访问数据库；Tool 负责连接动作能力，不负责把最新知识永久训练进模型。

可以先用一张责任表避免后续混淆：

| 问题 | 当前处理方式 | 继续阅读 |
|---|---|---|
| 这一次怎样描述任务 / 给示例 | Prompt / ICL | BERT/GPT 章；General Context → State/Context/Memory 章 |
| 模型长期不会稳定表现某种行为 | Post-training / SFT | Post-training 章 |
| 这次需要模型参数外的资料 | RAG | RAG 章 |
| 需要真实执行外部动作 | Tool / Capability | Tool 章 |

旧语料里那句很好的四分法仍保留为跨章 Decision Model（决策模型）：

> Prompt 管“这次怎么做”；RAG 管“这次参考什么”；SFT 管“训练进什么行为 / 能力”；Tool 管“真正做什么动作”。

但 BERT/GPT 章 不把 RAG、SFT、Tool 的完整定义复制进来。

<a id="ch02-base-instruct-chat-preview"></a>
### 3.10 Base / Instruct / Chat：先看差异，训练机制留到 Post-training

#### 本节新词

- **Base Model（基础模型）**：完成大规模预训练、具备语言建模能力但没有被专门塑造成指令助手的模型状态。它描述训练阶段，不代表“能力弱”。
- **Instruct Model（指令模型）**：经过指令数据等后训练，能够更稳定按任务要求输出的模型形态；具体 SFT 等机制留到下一章。
- **Chat Model（对话模型）**：针对多轮 System/User/Assistant 交互格式进一步适配的模型形态。厂商命名并不完全统一，Instruct 与 Chat 不能只凭名字机械划线。
- **Capability Domain（能力领域）**：Code、Math、Vision 等模型擅长处理的任务领域。它和 Base/Instruct/Chat 这种训练／交互形态是两个可以组合的维度。

旧语料把 Base / Instruct / Chat 与 Code / Math / Vision 做了一个重要维度区分：

```text
Base / Instruct / Chat
→ 更偏训练/交互形态

Code / Math / Vision
→ 更偏能力领域
```

两类维度可以组合，例如一个模型可以同时是 Instruct-oriented，又专门强化 Code 能力。

但“Base Model 为什么不会天然服从指令、SFT/Preference/RLHF/DPO 怎样把它变成 Assistant”属于 Post-training 章。本章只为 ICL 与 Post-training 的边界留下前向引用。

<a id="ch02-bert-reranker-boundary"></a>
### 3.11 BERT / Encoder 与 Reranker：模型路线 ≠ 系统责任

#### 本节新词

- **Reranker（重排序器）**：检索系统在候选已经召回以后，对候选做更细相关性判断并重新排序的责任角色。它描述系统职责，不绑定某个固定模型家族。
- **Cross-Encoder（交叉编码器）**：把 Query 与候选文档一起输入模型做联合相关性判断的用法，常用于精排。它是一种实现路线，不等于 Reranker 这个系统角色本身。

BERT / Encoder 描述模型怎样形成表示；Reranker 描述检索系统承担什么责任。BERT-style 模型可以实现这个责任，但二者不是同义词。

```text
Model route
BERT-style Encoder / Cross-Encoder
            ↓ can implement
Retrieval responsibility
Reranker
```

Retriever 怎样先找候选、Reranker 怎样精排，以及它们怎样进入 RAG，都留给后面的知识系统章节。本章到这里只守住一条边界：**模型家族 ≠ 检索组件责任。**

## 这些概念在后续章节由谁继续展开

- Transformer / Autoregressive Generation → [Transformer 章](01_Transformer为什么改变了大模型.md)。
- Retrieval / Reranker → [RAG 与知识系统](../02_知识与能力/01_模型怎样使用外部知识.md#ch06-retriever-reranker)。
- Scaling / GPT-1～3 详细演进 → [大模型能力怎样随规模增长](03_大模型能力怎样随规模增长.md#ch03-gpt-scaling-bridge)。
- Post-training / SFT / RLHF / DPO / Base-Instruct-Chat → [基础模型怎样变成对话助手](04_基础模型怎样变成对话助手.md#ch04-instruction-sft-tuning)。
- General Context Engineering → [状态、上下文与记忆](../04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md#ch11-context-assembly)。

<a id="ch02-review-self-check"></a>
## 用这些问题检查路线判断

1. BERT 与 GPT 都来自 Transformer，为什么会形成不同工程优势？
2. 为什么“BERT 没有失败”比“BERT 被 GPT 淘汰”更准确？
3. BERT-style Encoder 今天在哪些系统责任里仍有价值？
4. GPT 的自回归接口为什么容易统一多种生成任务？
5. In-context Learning 到底改变了什么，什么没有改变？
6. Zero-shot / One-shot / Few-shot 的差异是什么？
7. Few-shot ICL 为什么不等于 Fine-tuning？
8. Prompt Engineering 与 ICL 的历史关系是什么？
9. 为什么 Prompt 不等于 Context？
10. 为什么 BERT 与 Reranker 不能画等号？
11. Base/Instruct/Chat 与 Code/Math/Vision 为什么是两个维度？
12. 如果模型“没见过资料”，为什么不应把答案简单归到 ICL？

<a id="ch02-close"></a>
## 带着这条分叉进入 Scaling

### 本节新词

- **Scaling（规模扩展）**：通过扩大模型参数、训练数据和计算投入等方式继续提升模型能力的路线。下一章会讨论它为什么在 GPT 路线上成为关键推动力，以及“规模更大”为什么不自动等于“任务表现一定更好”。

到这里，两条路线的工程位置已经清楚：BERT-style Encoder 继续承担表示、匹配和检索基础能力，GPT-style Decoder 则把越来越多任务统一成生成接口；ICL 又让应用开发者能在不改参数的情况下临时切换任务。

下一章只追问 GPT 路线继续向前时发生的另一件事：当参数、数据和计算投入同时扩大，模型能力为什么会出现新的变化，行业又为什么一度把希望集中到 Scaling 上。

## 学习导航

[← 上一章](01_Transformer为什么改变了大模型.md) · [新版目录](../README.md) · [下一章 →](03_大模型能力怎样随规模增长.md)
