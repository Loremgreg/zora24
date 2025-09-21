# Diagrammes d'Architecture - Intégration TheFork

## 1. Diagramme de Séquence : Réservation de Restaurant

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant Z as ZoraAgent
    participant RM as RestaurantBookingManager
    participant TP as TheForkProvider
    participant TM as TokenManager
    participant API as TheFork API
    participant SB as Supabase

    Note over U,SB: Phase 1: Vérification des disponibilités du restaurant
    U->>Z: "Je veux réserver une table ce soir"
    Z->>Z: Extraction des paramètres (date, heure, nombre de personnes)
    Z->>RM: check_availability(date, time, party_size)
    RM->>TP: get_availabilities(date, party_size)
    
    TP->>TM: get_valid_token()
    alt Token expiré
        TM->>API: POST /oauth/token (client_credentials)
        API-->>TM: access_token
        TM->>TM: Cache token avec expiration
    end
    TM-->>TP: valid_access_token
    
    TP->>API: GET /v1/restaurants/{restaurant_id}/availabilities
    TP->>API: GET /v1/restaurants/{restaurant_id}/timeslots
    TP->>API: GET /v1/restaurants/{restaurant_id}/partysizes
    API-->>TP: Données de disponibilité
    TP->>TP: Agrégation et mapping
    TP-->>RM: List[BookingSlot]
    RM->>RM: Génération des slot_ids uniques
    RM-->>Z: Créneaux disponibles
    Z-->>U: "Voici nos créneaux disponibles : 19h00, 19h30, 20h00..."

    Note over U,SB: Phase 2: Sélection du créneau
    U->>Z: "Je prends 19h30"
    Z->>Z: Validation du créneau sélectionné
    
    TP->>API: GET /v1/restaurants/{id}/availabilities
    TP->>API: GET /v1/restaurants/{id}/timeslots
    TP->>API: GET /v1/restaurants/{id}/partysizes
    API-->>TP: Données de disponibilité
    TP->>TP: Agrégation et mapping
    TP-->>RM: List[BookingSlot]
    RM->>RM: Génération des slot_ids uniques
    RM-->>Z: Créneaux disponibles
    Z-->>U: "Voici les créneaux : 19h00, 19h30, 20h00..."

    Note over U,SB: Phase 3: Collecte des informations client
    U->>Z: "Je prends 19h30"
    Z->>Z: Demande nom, téléphone, email
    U->>Z: Fournit les informations personnelles
    
    Note over U,SB: Phase 4: Création de la réservation
    Z->>RM: book_restaurant_table(slot_id, customer_info)
    RM->>RM: Récupération du slot depuis le cache
    RM->>TP: create_reservation(slot, customer)
    
    TP->>API: POST /v1/restaurants/{restaurant_id}/reservations
    alt Succès
        API-->>TP: Confirmation de réservation
        TP->>TP: Mapping vers modèle Reservation
        TP-->>RM: Reservation confirmée
        RM-->>Z: Confirmation avec détails
        Z-->>U: "Parfait ! Votre table est réservée..."
    else Échec (restaurant complet)
        API-->>TP: Erreur 409 - Slot non disponible
        TP->>TP: Mapping vers RestaurantNotAvailableError
        TP-->>RM: Exception
        RM-->>Z: Gestion d'erreur
        Z-->>U: "Ce créneau n'est plus disponible, puis-je vous proposer..."
    end

    Note over U,SB: Phase 5: Logging et métriques (optionnel)
    Z->>SB: Log de la réservation réussie
```

## 2. Diagramme de Composants : Architecture Modulaire

```mermaid
graph TB
    subgraph "Agent Layer"
        A[ZoraAgent]
        A1[search_restaurants]
        A2[book_restaurant]
        A3[cancel_reservation]
        A --> A1
        A --> A2
        A --> A3
    end
    
    subgraph "Business Logic Layer"
        B[RestaurantBookingManager]
        B1[Provider Factory]
        B2[Error Handler]
        B3[Slot Cache]
        B --> B1
        B --> B2
        B --> B3
    end
    
    subgraph "Provider Layer"
        C1[TheForkProvider]
        C2[ZenchefProvider]
        C3[FakeProvider]
        
        C1 --> C1A[API Client]
        C1 --> C1B[Data Mapper]
        C1 --> C1C[Error Handler]
    end
    
    subgraph "Authentication Layer"
        D[OAuth2Manager]
        D1[TokenManager]
        D2[Token Cache]
        D --> D1
        D1 --> D2
    end
    
    subgraph "Data Layer"
        E[Models]
        E1[Restaurant]
        E2[BookingSlot]
        E3[Reservation]
        E4[CustomerInfo]
        E --> E1
        E --> E2
        E --> E3
        E --> E4
    end
    
    subgraph "Configuration Layer"
        F[Config Manager]
        F1[Supabase Client]
        F2[Environment Variables]
        F --> F1
        F --> F2
    end
    
    subgraph "External Services"
        G1[TheFork API]
        G2[Zenchef API]
        G3[Supabase DB]
    end
    
    A --> B
    B1 --> C1
    B1 --> C2
    B1 --> C3
    
    C1 --> D
    C2 --> D
    
    C1 --> E
    C2 --> E
    C3 --> E
    
    B --> F
    
    C1 --> G1
    C2 --> G2
    F1 --> G3
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C1 fill:#fff3e0
    style C2 fill:#fff3e0
    style C3 fill:#fff3e0
    style D fill:#e8f5e8
    style E fill:#fce4ec
    style F fill:#f1f8e9
```

## 3. Diagramme de Flux : Gestion des Tokens OAuth2

```mermaid
flowchart TD
    A[Demande API] --> B{Token en cache?}
    B -->|Oui| C{Token valide?}
    B -->|Non| D[Demander nouveau token]
    
    C -->|Oui| E[Utiliser token existant]
    C -->|Non| D
    
    D --> F[POST /oauth/token]
    F --> G{Succès?}
    
    G -->|Oui| H[Stocker token + expiration]
    G -->|Non| I[AuthenticationError]
    
    H --> E
    E --> J[Exécuter requête API]
    
    J --> K{Succès?}
    K -->|Oui| L[Retourner résultat]
    K -->|401 Unauthorized| M[Invalider cache]
    K -->|Autre erreur| N[Propager erreur]
    
    M --> D
    
    style A fill:#e3f2fd
    style E fill:#e8f5e8
    style I fill:#ffebee
    style L fill:#e8f5e8
    style N fill:#ffebee
```

## 4. Diagramme d'États : Cycle de Vie d'une Réservation

```mermaid
stateDiagram-v2
    [*] --> Searching: search_restaurants()
    
    Searching --> RestaurantsFound: Restaurants disponibles
    Searching --> NoResults: Aucun restaurant
    
    RestaurantsFound --> CheckingAvailability: get_availabilities()
    
    CheckingAvailability --> SlotsAvailable: Créneaux trouvés
    CheckingAvailability --> NoSlots: Aucun créneau
    
    SlotsAvailable --> CollectingInfo: Utilisateur choisit créneau
    
    CollectingInfo --> BookingInProgress: Informations complètes
    CollectingInfo --> CollectingInfo: Informations manquantes
    
    BookingInProgress --> BookingConfirmed: create_reservation() succès
    BookingInProgress --> BookingFailed: create_reservation() échec
    BookingInProgress --> SlotUnavailable: Créneau pris entre temps
    
    BookingConfirmed --> [*]: Fin du processus
    
    BookingFailed --> SlotsAvailable: Proposer alternatives
    SlotUnavailable --> SlotsAvailable: Proposer alternatives
    NoResults --> [*]: Fin sans réservation
    NoSlots --> [*]: Fin sans réservation
    
    note right of BookingConfirmed
        Réservation créée avec succès
        Confirmation envoyée à l'utilisateur
    end note
    
    note right of SlotUnavailable
        Gestion de la concurrence
        Slot pris par un autre utilisateur
    end note
```

## 5. Diagramme de Déploiement : Architecture Système

```mermaid
graph TB
    subgraph "Client Layer"
        U[Utilisateur]
        P[Téléphone/Web]
        U --> P
    end
    
    subgraph "LiveKit Infrastructure"
        L[LiveKit Server]
        P --> L
    end
    
    subgraph "Zora Agent Runtime"
        Z[Python Agent Process]
        Z1[zora_agent.py]
        Z2[restaurant_booking/]
        Z --> Z1
        Z --> Z2
        L --> Z
    end
    
    subgraph "Configuration & Data"
        S[Supabase]
        S1[assistant_restaurant_configs]
        S2[Edge Functions]
        S --> S1
        S --> S2
        Z --> S
    end
    
    subgraph "External APIs"
        T[TheFork API]
        T1[OAuth2 Endpoint]
        T2[Restaurant API]
        T --> T1
        T --> T2
        Z2 --> T
    end
    
    subgraph "Monitoring & Logs"
        M[Langfuse/Logging]
        Z --> M
    end
    
    style U fill:#e1f5fe
    style Z fill:#f3e5f5
    style S fill:#fce4ec
    style T fill:#fff3e0
    style M fill:#f1f8e9
```

## 6. Diagramme de Classes : Modèles de Données

```mermaid
classDiagram
    class RestaurantProvider {
        <<interface>>
        +initialize() Promise~void~
        +search_restaurants(location, date, party_size) Promise~Restaurant[]~
        +get_availabilities(restaurant_id, date, party_size) Promise~BookingSlot[]~
        +create_reservation(slot, customer) Promise~Reservation~
        +cancel_reservation(reservation_id) Promise~void~
    }
    
    class TheForkProvider {
        -client_id: str
        -client_secret: str
        -base_url: str
        -token_manager: TokenManager
        +initialize() Promise~void~
        +search_restaurants(params) Promise~Restaurant[]~
        +get_availabilities(params) Promise~BookingSlot[]~
        +create_reservation(slot, customer) Promise~Reservation~
        -_make_api_call(endpoint, method, data) Promise~dict~
        -_map_restaurant_data(api_data) Restaurant
        -_map_slot_data(api_data) BookingSlot
    }
    
    class TokenManager {
        -client_id: str
        -client_secret: str
        -base_url: str
        -token_cache: dict
        -lock: AsyncLock
        +get_valid_token() Promise~str~
        -_refresh_token() Promise~void~
        -_is_token_expired() bool
    }
    
    class Restaurant {
        +id: str
        +name: str
        +address: str
        +cuisine_type: str
        +rating: float
        +price_range: str
        +phone: str
        +description: str
    }
    
    class BookingSlot {
        +id: str
        +restaurant: Restaurant
        +datetime: datetime
        +duration_minutes: int
        +party_size: int
        +price: float
        +unique_hash: str
        +is_available: bool
    }
    
    class CustomerInfo {
        +name: str
        +phone: str
        +email: str
        +special_requests: str
        +validate() bool
    }
    
    class Reservation {
        +id: str
        +restaurant: Restaurant
        +customer: CustomerInfo
        +datetime: datetime
        +party_size: int
        +status: str
        +confirmation_code: str
        +created_at: datetime
        +special_requests: str
    }
    
    class RestaurantBookingManager {
        -provider: RestaurantProvider
        -slot_cache: dict
        +create_provider(provider_type, config) RestaurantProvider
        +search_restaurants(params) Promise~Restaurant[]~
        +book_restaurant(slot_id, customer) Promise~Reservation~
        +cancel_reservation(reservation_id) Promise~void~
        -_handle_booking_error(error) str
    }
    
    RestaurantProvider <|-- TheForkProvider
    TheForkProvider --> TokenManager
    TheForkProvider --> Restaurant
    TheForkProvider --> BookingSlot
    TheForkProvider --> Reservation
    RestaurantBookingManager --> RestaurantProvider
    BookingSlot --> Restaurant
    Reservation --> Restaurant
    Reservation --> CustomerInfo
```

Ces diagrammes illustrent l'architecture complète de l'intégration TheFork, depuis les interactions utilisateur jusqu'aux détails techniques de l'implémentation.