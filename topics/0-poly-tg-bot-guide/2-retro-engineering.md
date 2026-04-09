---
title: "Old School vs New School SWE"
summary: null
ascii_seed: terminal
---

## Рутина інженера

### 5 років тому

```mermaid
flowchart TB
  C((Clients)) --> EDGE[CDN / WAF / Rate limiting]
  EDGE --> GW[API Gateway / BFF]

  subgraph core["Core services"]
    AUTH[Auth service]
    USERS[User service]
    GRAPH[Social graph service]
    TWEETS[Tweet service]
    MEDIA[Media service]
    DM[Messaging service]
  end

  subgraph realtime["Asynchronous + realtime"]
    BUS[(Event bus)]
    Q[(Queues)]
    FANOUT[Timeline fanout]
    NOTIFY[Notification service]
  end

  subgraph readpaths["Read paths"]
    FEED[Timeline / Feed service]
    SEARCH[Search service]
  end

  subgraph storage["Storage"]
    CACHE[(Redis cache)]
    SQL[(SQL: users/auth)]
    KV[(NoSQL: tweets / timelines)]
    IDX[(Search index)]
    OBJ[(Object storage: media)]
  end

  subgraph platform["Platform"]
    CFG[Config + Feature flags]
    OBS[Observability<br/>logs / metrics / traces]
  end

  GW --> AUTH & USERS & GRAPH & TWEETS & MEDIA & DM & FEED & SEARCH
  GW --> CFG
  GW --> OBS

  AUTH --> SQL
  USERS --> SQL
  GRAPH --> KV
  TWEETS --> KV
  MEDIA --> OBJ
  DM --> KV

  AUTH --> OBS
  USERS --> OBS
  GRAPH --> OBS
  TWEETS --> OBS
  MEDIA --> OBS
  DM --> OBS
  FEED --> OBS
  SEARCH --> OBS

  AUTH --> CFG
  USERS --> CFG
  GRAPH --> CFG
  TWEETS --> CFG
  MEDIA --> CFG
  DM --> CFG
  FEED --> CFG
  SEARCH --> CFG

  TWEETS --> BUS
  BUS --> Q
  Q --> FANOUT
  FANOUT --> KV
  BUS --> NOTIFY

  FEED --> CACHE
  FEED --> KV
  SEARCH --> IDX
  TWEETS --> IDX
```

### Сьогодні

```md
Імплементуй систему (компоненти, звʼязки, read/write paths, async-процеси, сховища).

## Ціль
Зібрати працюючий клон “X” у вигляді production-орієнтованого монорепо/полірепо (на твій вибір), який піднімається локально і містить мінімально повний вертикальний зріз функціоналу.

## Edge + Gateway
- `CDN / WAF / Rate limiting` (можна як заглушка/конфіг у локальному середовищі)
- `API Gateway / BFF`: єдина точка входу для клієнтів, маршрутизація до сервісів, auth middleware, кореляційні ID

## Core services
- `Auth service` → SQL (реєстрація/логін, JWT/сесії, refresh, RBAC за потреби)
- `User service` → SQL (профіль, налаштування)
- `Social graph service` → NoSQL/KV (follow/unfollow, список фоловінг/фоловерів)
- `Tweet service` → NoSQL/KV (пости, лайки/реплаї мінімально), **пише події в Event bus**
- `Media service` → Object storage (upload/download, привʼязка медіа до поста)
- `Messaging service (DM)` → NoSQL/KV (діалоги/повідомлення), **перевірка auth**

## Asynchronous + realtime
- `Event bus` + `Queues`
- `Timeline fanout`: споживає події постів → розкладає у timelines в NoSQL/KV
- `Notification service`: споживає події → нотифікації про пости/профілі

## Read paths
- `Timeline / Feed service`: читає timelines з NoSQL/KV + кешує в Redis (hot paths)
- `Search service`: пошук по постах через `Search index`
- `Tweet service` оновлює `Search index` (індексація постів)

## Platform
- `Config + Feature flags` (мінімальна реалізація: централізований конфіг/ENV + прапорці)
- `Observability`: structured logs, metrics, traces (мінімум: кореляція запитів між сервісами)

## Вимоги до результату
- Постав всі сервіси + залежності в `docker compose` (SQL, Redis, KV/NoSQL, object storage-емуль, search engine-емуль/мінімальна реалізація).
- Опиши API контракти (OpenAPI або чіткі REST endpoints), моделі даних, і **подієві контракти** (назви подій, payload).
- Додай базові тести (unit + 1-2 інтеграційні на write→event→fanout→feed).
- Додай короткий `README` з командами запуску/перевірки.

Почни з уточнення припущень, потім дай план, і після цього — реалізуй код.
```

<br />
<br />

## Цикл роботи розробника

### Сьогодні

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

### 5 років тому

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


## Рутина НЕ інженера

### 5 років тому

![Ancient vibe](./assets/retro-vibe.png)

### Сьогодні

```md
Зроби HFT бота для поліка з прибутковою стратегією та без loss.
```
