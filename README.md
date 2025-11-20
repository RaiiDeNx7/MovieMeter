# Group Members:
- Hunter Smith
- Guillermo Flores
- Darien Walker

# Dependencies
- python
- pip (python installation package)
- Django (Pip Install dgango)

# Admin Access
[Admin Access](http://127.0.0.1:8000/admin)


# Running Program

1. Change directory to root folder, AI Movie Project

2. Install dependencies
pip install django django-environ psycopg2-binary python-dotenv
py -m pip install supabase requests
py -m manage makemigrations
py -m manage migrate

1. Run Server
python manage.py runserver 
py -m manage runserver


# Running SVD Model

1. Navigate to root

2. INstall Dependencies

3. run python scripts/update_recommendations.py


# Visual Representation of Process 

                   ┌──────────────────────────────────────────────┐
                   │               INPUT DATA                     │
                   │ Users + Movies + Ratings (e.g., 5)           │
                   └──────────────────────────────────────────────┘
                                     │
                                     ▼
                  ┌──────────────────────────────────────────────┐
                  │      USER–MOVIE RATING MATRIX (R)            │
                  │                                              │
                  │          M1   M2   M3   M4   M5              │
                  │ U1      5     ?    5    ?    ?               │
                  │ U2      ?     5    ?    ?    ?               │
                  │ U3      5     ?    ?    ?    5               │
                  │ ...                                            │
                  └──────────────────────────────────────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │           MATRIX FACTORIZATION (Learn latent factors)            │
        │                                                                  │
        │  R ≈ P × Qᵀ                                                      │
        │                                                                  │
        │  P = user latent factor matrix      Q = movie latent factor matrix│
        │                                                                  │
        │  U1 → [1.2, -0.3,  0.9, ...]   M1 → [0.8,  0.1,  2.0, ...]       │
        │  U2 → [0.5,  1.7, -1.0, ...]   M2 → [1.1, -0.4, -0.3, ...]       │
        │                                                                  │
        └──────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
               ┌──────────────────────────────────────────────┐
               │ Compute predicted rating for each (u, m):    │
               │                                              │
               │   r̂ᵤₘ = μ + bᵤ + bₘ + Pᵤ · Qₘ               │
               │                                              │
               └──────────────────────────────────────────────┘
                                     │
                                     ▼
           ┌───────────────────────────────────────────────────────────┐
           │ Compare predicted rating r̂ᵤₘ to real rating rᵤₘ           │
           │                                                             │
           │  error = (rᵤₘ - r̂ᵤₘ)²                                      │
           │                                                             │
           └───────────────────────────────────────────────────────────┘
                                     │
                                     ▼
       ┌──────────────────────────────────────────────────────────────────────┐
       │  GRADIENT DESCENT UPDATES                                            │
       │  Adjust parameters to reduce error:                                   │
       │                                                                       │
       │   - update user factors Pᵤ                                            │
       │   - update movie factors Qₘ                                           │
       │   - update user bias bᵤ                                               │
       │   - update movie bias bₘ                                              │
       │                                                                       │
       └──────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────────┐
                │ Repeat thousands of times (epochs)         │
                │ Model learns hidden “patterns”             │
                └────────────────────────────────────────────┘
                                     │
                                     ▼
       ┌──────────────────────────────────────────────────────────────┐
       │            AFTER TRAINING                                    │
       │  Users & movies now live in the same latent space            │
       │  You can predict rating for ANY user–movie pair              │
       └──────────────────────────────────────────────────────────────┘
