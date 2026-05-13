import os
from decouple import config

SECRET_KEY = config('SECRET_KEY', default='change-me')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = [
    '.railway.app',
    'localhost',
    '127.0.0.1',
]

CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
]

# Database — uses Railway's Postgres env vars automatically
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3')
    )
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ← add this second
    # ... rest of your middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
