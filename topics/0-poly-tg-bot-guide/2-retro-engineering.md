---
title: "Old school vs Modern Engineering"
summary: null
ascii_seed: terminal
---

### Рутина інженера

##### 5 років тому

```mermaid
flowchart TB
  C((Клієнти))
  GW[API Gateway]

  subgraph identity["Auth & Graph"]
    AUTH[Auth]
    PROFILE[Профілі]
    GRAPH[Social graph<br/>підписки]
  end

  subgraph content["Content"]
    POST[Пости / твіти]
    MEDIA[Медіа]
    FEED[Стрічка]
  end

  subgraph comm["Search & Communication"]
    SEARCH[Пошук]
    NOTIFY[Сповіщення]
    DM[Direct messages]
  end

  C --> GW
  GW --> AUTH & PROFILE & GRAPH & POST & MEDIA & FEED & SEARCH & NOTIFY & DM

  AUTH --> PROFILE
  GRAPH --> PROFILE
  POST --> MEDIA
  FEED --> GRAPH
  FEED --> POST
  SEARCH --> POST
  NOTIFY --> POST
  NOTIFY --> PROFILE
  DM --> AUTH
  DM --> PROFILE
```

##### Цикл роботи розробника

```mermaid
flowchart LR
  A[Уточнення вимог] --> B[Дизайн / архітектура]
  B --> C[План / декомпозиція]
  C --> D[Імплементація]
  D --> E[Локальні тести]
  E --> F{Працює як очікується?}
  F -- "ні" --> G[Дебагінг]
  G --> H[Рефакторинг]
  H --> D
  F -- "так" --> I[Ревʼю коду]
  I --> J[Мерж / реліз]
  J --> K[Моніторинг / фідбек]
  K --> A
```


##### Сьогодні

```md
Створи повний клон системи "X": API Gateway, Auth → Profile, Social graph → Profile, пости з медіа, стрічка що збирає граф + пости, пошук по постах, сповіщення про пости і профілі, DM з перевіркою auth. Имплементуй проект, зроби його готовим до високого навантаження. Не роби помилок!
```

```mermaid
flowchart LR
  H[Людина: ціль + контекст + обмеження] --> P[Промпт / завдання]
  P --> AI[AI: дизайн/архітектура + декомпозиція + імплементація<br/>+ тести + рефакторинг + ревʼю коду]
  AI --> D[Демо / MR / артефакти]
  D --> V{Людина: валідація результату}
  V -- "не ок" --> F[Фідбек / уточнення]
  F --> AI
  V -- "ок" --> S[Мерж / реліз]
```

<br />
<br />

### Рутина НЕ інженера

#### 5 років тому

![Ancient vibe](./assets/retro-vibe.png)

#### Сьогодні

```md
Зроби HFT бота для поліка з прибутковою стратегією та без loss.
```
