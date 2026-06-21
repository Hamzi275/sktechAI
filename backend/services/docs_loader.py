"""
Diagram syntax documentation.
Primary: hardcoded strings (always available, never fails)
Secondary: web fetch (optional, graceful fallback if it fails)
"""
import logging
from typing import Optional, Tuple, Dict

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HARDCODED_DOCS: Dict[str, Dict[str, str]] = {
    "mermaid_flowchart": {
        "title": "Mermaid Flowchart",
        "url": "https://mermaid.js.org/syntax/flowchart.html",
        "content": """
Mermaid Flowchart Syntax:
Start with: graph TD (top-down) or graph LR (left-right)

Node shapes:
  A[Rectangle]          - standard box
  B(Rounded rectangle)  - rounded box
  C{Diamond}            - decision/condition
  D[(Cylinder)]         - database
  E([Stadium shape])    - terminal/start/end
  F[[Subroutine]]       - subroutine

Connections:
  A --> B              solid arrow
  A --- B              solid line no arrow
  A -.-> B             dotted arrow
  A ==> B              thick arrow
  A -->|label| B       arrow with text label

Subgraphs:
  subgraph Title
    A --> B
  end

Example:
graph TD
  A([Start]) --> B[Get user input]
  B --> C{Valid?}
  C -->|Yes| D[Process data]
  C -->|No| E[Show error]
  D --> F([End])
  E --> B
"""
    },
    "mermaid_sequence": {
        "title": "Mermaid Sequence Diagram",
        "url": "https://mermaid.js.org/syntax/sequenceDiagram.html",
        "content": """
Mermaid Sequence Diagram Syntax:
Start with: sequenceDiagram

Participants:
  participant A as Alice
  actor B as Bob

Message types:
  A->>B: Solid arrow (request)
  B-->>A: Dashed arrow (response)
  A->>+B: Activate B
  B-->>-A: Deactivate B

Control flow:
  loop Every minute
    A->>B: Ping
  end
  alt Success case
    A->>B: Do X
  else Failure case
    A->>B: Do Y
  end
  opt Optional
    A->>B: Maybe do this
  end

Notes:
  Note right of A: This is a note
  Note over A,B: Spanning note

Example:
sequenceDiagram
  participant U as User
  participant S as Server
  participant D as Database
  U->>+S: POST /login
  S->>+D: SELECT user WHERE email=?
  D-->>-S: User record
  S-->>-U: JWT token
"""
    },
    "mermaid_class": {
        "title": "Mermaid Class Diagram",
        "url": "https://mermaid.js.org/syntax/classDiagram.html",
        "content": """
Mermaid Class Diagram Syntax:
Start with: classDiagram

Class definition:
  class ClassName {
    +publicAttribute String
    -privateAttribute int
    #protectedMethod() void
    ~packageMethod() bool
  }

Visibility: + public, - private, # protected, ~ package

Relationships:
  Animal <|-- Dog          inheritance
  Car *-- Engine           composition
  Person o-- Address       aggregation
  Teacher --> Student      association
  Class ..> Interface      dependency
  Class ..|> Interface     realization

  Customer "1" --> "many" Order : places

Example:
classDiagram
  class User {
    +int id
    +String email
    +login() bool
    +logout() void
  }
  class Order {
    +int id
    +float total
    +getItems() List
  }
  User "1" --> "0..*" Order : places
"""
    },
    "mermaid_er": {
        "title": "Mermaid ER Diagram",
        "url": "https://mermaid.js.org/syntax/entityRelationshipDiagram.html",
        "content": """
Mermaid ER Diagram Syntax:
Start with: erDiagram

Entity with attributes:
  ENTITY_NAME {
    datatype attribute_name PK
    datatype attribute_name FK
    datatype attribute_name UK
  }

Data types: int, string, date, datetime, boolean, float, decimal, text
Keys: PK (primary key), FK (foreign key), UK (unique key)

Relationships (cardinality):
  CUSTOMER ||--o{ ORDER : places
  ||--||  one to one
  ||--o{  one to many
  }o--o{  many to many

Example:
erDiagram
  CUSTOMER {
    int id PK
    string name
    string email UK
  }
  ORDER {
    int id PK
    int customer_id FK
    decimal total
  }
  CUSTOMER ||--o{ ORDER : places
"""
    },
    "plantuml_class": {
        "title": "PlantUML Class Diagram",
        "url": "https://plantuml.com/class-diagram",
        "content": """
PlantUML Class Diagram Syntax:
Wrap in: @startuml ... @enduml

Classes:
  class ClassName {
    +field : Type
    -privateField : Type
    +method() : ReturnType
    {static} staticField : Type
    {abstract} abstractMethod() : Type
  }

Special types:
  interface InterfaceName { }
  abstract class AbstractName { }

Relationships:
  Child --|> Parent           inheritance
  Class ..|> Interface        realization
  Whole *-- Part              composition
  Container o-- Element       aggregation
  ClassA --> ClassB           directed association
  ClassA ..> ClassB           dependency

Multiplicity:
  ClassA "1" --> "0..*" ClassB : relationship label

Example:
@startuml
interface Drawable {
  +draw() : void
}
abstract class Shape {
  #color : String
  +{abstract} area() : float
}
class Circle {
  -radius : float
  +area() : float
  +draw() : void
}
Shape <|-- Circle
Circle ..|> Drawable
@enduml
"""
    },
    "plantuml_sequence": {
        "title": "PlantUML Sequence Diagram",
        "url": "https://plantuml.com/sequence-diagram",
        "content": """
PlantUML Sequence Diagram Syntax:
Wrap in: @startuml ... @enduml

Participants:
  participant "Display Name" as ShortName
  actor UserActor as U
  database DBComp

Messages:
  A -> B : Message text          solid arrow
  A --> B : Dotted message       dotted arrow
  A ->x B : Lost message         X at end

Activation:
  activate B
  A -> B : Call
  B --> A : Return
  deactivate B

Groups:
  alt Success
    A -> B : happy path
  else Failure
    A -> B : error path
  end
  loop N times
    A -> B : repeated
  end

Notes:
  note left of A : left note
  note right of B : right note
  note over A, B : spanning note

Example:
@startuml
actor User as U
participant "API Server" as API
database PostgreSQL as DB

U -> API : POST /login {email, password}
activate API
API -> DB : SELECT * FROM users WHERE email=?
activate DB
DB --> API : User record or null
deactivate DB
alt User found
  API --> U : 200 OK {token}
else Not found
  API --> U : 401 Unauthorized
end
deactivate API
@enduml
"""
    }
}

WEB_DOC_URLS = {
    "mermaid_flowchart": "https://mermaid.js.org/syntax/flowchart.html",
    "mermaid_sequence": "https://mermaid.js.org/syntax/sequenceDiagram.html",
    "mermaid_class": "https://mermaid.js.org/syntax/classDiagram.html",
    "mermaid_er": "https://mermaid.js.org/syntax/entityRelationshipDiagram.html",
    "plantuml_class": "https://plantuml.com/class-diagram",
    "plantuml_sequence": "https://plantuml.com/sequence-diagram",
}


def fetch_web_doc(url: str, timeout: int = 5) -> Optional[str]:
    """
    Attempt to fetch doc from web. Returns text or None on any error.
    NEVER raises — always returns None on failure so startup can't crash.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0 SketchFlowAI/3.0"}
        response = requests.get(url, timeout=timeout, headers=headers)
        if response.status_code != 200:
            return None
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text[:3000] if text else None
    except Exception as e:
        logger.warning(f"Web doc fetch failed for {url}: {e}")
        return None


def get_doc_content(collection_name: str, try_web: bool = True) -> Tuple[str, str, bool]:
    """
    Returns (content, url, fetched_from_web).
    Always returns valid content — falls back to hardcoded if web fails.
    """
    doc = HARDCODED_DOCS.get(collection_name)
    if not doc:
        return "", "", False

    url = WEB_DOC_URLS.get(collection_name, "")

    if try_web and url:
        web_content = fetch_web_doc(url)
        if web_content and len(web_content) > 200:
            logger.info(f"Fetched web docs for {collection_name}")
            return web_content, url, True
        logger.info(f"Web fetch failed for {collection_name}, using hardcoded docs")

    return doc["content"], url, False


def load_all_docs(rag_service, try_web: bool = False) -> Dict[str, int]:
    """
    Load all docs into RAG. Returns chunk counts per collection.
    try_web=False by default for fast, reliable startup.
    """
    results = {}
    for collection_name in HARDCODED_DOCS.keys():
        content, url, _ = get_doc_content(collection_name, try_web=try_web)
        if content:
            count = rag_service.add_docs(collection_name, content, source_url=url)
            results[collection_name] = count
    return results
