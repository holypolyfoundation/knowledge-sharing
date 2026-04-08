---
title: "Old school vs Modern Engineering"
summary: null
ascii_seed: terminal
---

#### Рутина інженера

##### 5 років тому

```mermaid
flowchart TB
  C((Клієнти))
  GW[API Gateway / BFF]

  subgraph identity["Ідентичність і граф"]
    AUTH[Auth]
    PROFILE[Профілі]
    GRAPH[Social graph<br/>підписки]
  end

  subgraph content["Контент"]
    POST[Пости / твіти]
    MEDIA[Медіа]
    FEED[Стрічка]
  end

  subgraph comm["Пошук і комунікації"]
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

##### Сьогодні

```md
Згенеруй систему: API Gateway, Auth → Profile, Social graph → Profile, пости з медіа, стрічка що збирає граф + пости, пошук по постах, сповіщення про пости і профілі, DM з перевіркою auth. Имплементуй проект, зроби його готовим до високого навантаження. Не роби помилок!
```

#### Рутина НЕ інженера

#### 5 років тому

![Ancient vibe](./assets/retro-vibe.png)

#### Сьогодні

```md
Зроби HFT бота для поліка з прибутковою стратегією та без loss.
```
