# LabDesk

Aplicación de mesa de ayuda para registrar y dar seguimiento a incidencias. El proyecto usa React y Vite en el frontend, Django REST Framework en el backend y SQLite para persistir la información.

## Requisitos

- Python 3.10 o posterior
- Node.js y npm

## Instalación y ejecución en Windows

Abre dos terminales de PowerShell desde la carpeta del proyecto.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

El backend estará disponible en `http://127.0.0.1:8000/`. Mantén esta terminal abierta.

### Frontend

En la segunda terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173/` e inicia sesión con la cuenta creada en el backend.

## Funcionalidades

- Crear, consultar, editar, filtrar y eliminar incidencias.
- Asignar responsable, ubicación, prioridad, estado y fecha límite.
- Ver alertas para incidencias vencidas o que vencen hoy o mañana; las resueltas no generan alertas.
- Consultar indicadores de estado, vencimientos, prioridades y porcentaje de resolución.
- Registrar comentarios asociados a cada incidencia; se guarda el usuario autenticado y la fecha.
- Los cambios se guardan en SQLite y permanecen después de recargar la página.

## Datos de demostración

En una base de datos vacía, carga los cinco ejemplos de la fixture:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py loaddata incidencias_demo
```

Para acceder a la aplicación también necesitas crear un usuario con `python manage.py createsuperuser`.

## Pruebas

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test incidencias
```

Para verificar la compilación del frontend:

```powershell
cd frontend
npm run build
```

## Seguridad

No agregues contraseñas, tokens, claves secretas, la base de datos local, `.venv`, `node_modules` ni archivos `.env` al repositorio. En producción, configura `DJANGO_SECRET_KEY` como variable de entorno con una clave segura. La clave predeterminada del proyecto es solo para desarrollo local; el servidor de desarrollo de Django no debe usarse en producción.
