# Clarification du Modèle Métier - Architecture TheFork

## Point de Clarification Important

Suite à votre feedback, j'ai ajusté l'architecture pour refléter correctement le modèle métier de Zora :

## Modèle Métier Correct

**Un Assistant Zora = Un Restaurant Spécifique**

- Chaque assistant vocal Zora travaille pour UN restaurant en particulier
- L'assistant ne fait PAS de recherche générale de restaurants
- L'assistant gère uniquement les réservations pour SON restaurant configuré

## Changements Architecturaux Appliqués

### 1. Fonctions-Outils Modifiées

**AVANT (incorrect) :**
```python
@function_tool
async def search_restaurants(self, ctx, location: str, date: str, time: str, party_size: int) -> str:
    """Rechercher des restaurants disponibles"""  # ❌ Trop générique
```

**APRÈS (correct) :**
```python
@function_tool
async def check_restaurant_availability(self, ctx, date: str, time: str, party_size: int) -> str:
    """Vérifier les disponibilités du restaurant configuré"""  # ✅ Spécifique au restaurant

@function_tool
async def book_restaurant_table(self, ctx, slot_id: str, user_name: str, user_phone: str, user_email: str, party_size: int) -> str:
    """Réserver une table dans LE restaurant configuré"""  # ✅ Spécifique au restaurant
```

### 2. Configuration Ajustée

**Configuration Supabase mise à jour :**
```sql
CREATE TABLE assistant_restaurant_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'thefork', 'zenchef', etc.
    restaurant_id VARCHAR(255) NOT NULL, -- ✅ ID du restaurant spécifique
    enabled BOOLEAN DEFAULT false,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Interface Provider Simplifiée

**AVANT :**
```python
class RestaurantProvider(Protocol):
    async def search_restaurants(self, location: str, date: datetime, party_size: int) -> list[Restaurant]: ...  # ❌
```

**APRÈS :**
```python
class RestaurantProvider(Protocol):
    async def get_restaurant_info(self) -> Restaurant: ...  # ✅ Info du restaurant configuré
    async def get_availabilities(self, date: datetime, party_size: int) -> list[BookingSlot]: ...  # ✅ Disponibilités du restaurant configuré
```

### 4. Manager Ajusté

```python
class RestaurantBookingManager:
    def __init__(self, provider_type: str, config: dict, restaurant_id: str, timezone: str):
        self.restaurant_id = restaurant_id  # ✅ ID du restaurant spécifique
        self.provider = self.create_provider(provider_type, config, restaurant_id)
```

## Flux Utilisateur Corrigé

**Conversation type :**
```
Utilisateur: "Je veux réserver une table ce soir"
Zora: "Parfait ! Laissez-moi vérifier nos disponibilités pour ce soir..."
      [Appel à check_restaurant_availability()]
Zora: "Nous avons des créneaux disponibles à 19h00, 19h30 et 20h00. Lequel vous convient ?"
Utilisateur: "19h30 s'il vous plaît"
Zora: "Excellent ! Pour combien de personnes ?"
      [Collecte des informations client]
Zora: "Parfait ! Votre table pour 2 personnes est réservée pour ce soir à 19h30..."
      [Appel à book_restaurant_table()]
```

## Endpoints TheFork Utilisés

Tous les appels API utilisent l'ID du restaurant configuré :

- `GET /v1/restaurants/{restaurant_id}/availabilities`
- `GET /v1/restaurants/{restaurant_id}/timeslots`
- `GET /v1/restaurants/{restaurant_id}/partysizes`
- `POST /v1/restaurants/{restaurant_id}/reservations`

## Avantages de cette Approche

✅ **Simplicité** : Pas de logique de recherche complexe
✅ **Performance** : Appels API directs sur le restaurant configuré
✅ **Sécurité** : Chaque assistant ne peut gérer que SON restaurant
✅ **Cohérence** : Modèle similaire à Cal.com (un assistant = un calendrier)

Cette clarification assure que l'architecture correspond exactement au modèle métier de votre SaaS.