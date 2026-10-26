# CLAUDE.md — Invoicer (2M Equipment)

App web que reemplaza el viejo programa .NET. Envía confirmaciones ACH a proveedores
(correo con plantilla de marca + PDF adjunto). Stack: **FastAPI + SQLModel + SQLite**
(backend) y **React/Vite** (frontend, ya compilado dentro de `backend/app/static`).

Este repo viene **completo para desplegar**: incluye la base de datos con los datos ya
migrados (38 proveedores, 647 confirmaciones), el `.env` y el frontend ya compilado.

## Correr en este servidor (camino mínimo: solo instalar y arrancar)
Requisito: Python 3.10+ (no hace falta Node porque el frontend ya está compilado).
```bash
cd backend
./run.sh
```
`run.sh` crea el entorno virtual, instala dependencias (`requirements.txt`) y levanta el
servidor. Abre: **http://localhost:8000**
Variables opcionales: `PORT=8000 HOST=0.0.0.0 ./run.sh`

Login inicial: **admin / admin123** (cámbialo en Settings).

## Si cambiaste el frontend (recompilar)
Requiere Node 18+:
```bash
./build.sh          # reconstruye React -> backend/app/static
# o todo junto:
./start.sh          # build + instalar backend + arrancar
```

## Desarrollo (recarga en caliente)
```bash
./dev.sh            # API :8000 + Vite :5173  (abrir :5173)
```

## Qué hay que configurar
- **Contraseña SMTP de Office 365**: entra a Settings y ponla (la vieja dejó de servir).
  Usa "Send test" para probar el servidor antes de enviar a proveedores.
- Los datos de empresa y los textos del correo también se editan en Settings.

## Dónde están los datos
- Base de datos: `backend/data/invoicer.db` (SQLite). **Respalda esta carpeta.**
- Secreto JWT: `backend/data/.secret_key` y/o `SECRET_KEY` en `backend/.env`.
- Logo de marca (correo y PDF): `backend/app/assets/logo.jpeg`.

## Estructura
```
backend/   FastAPI. app/main.py monta la API y sirve el SPA en /.
           app/routers/ (auth, vendors, confirmations, history, settings)
           app/{models,schemas,security,email_service,pdf_service}.py
           migrate_from_dotnet.py  (importa Vendors.xlsx + ACHConfirmations.dat)
frontend/  React (Vite). Se compila a backend/app/static.
start.sh / build.sh / run.sh / dev.sh
```

## Importar datos del programa viejo (si hiciera falta de nuevo)
```bash
cd backend && . .venv/bin/activate
python migrate_from_dotnet.py --vendors /ruta/Vendors.xlsx --confirmations /ruta/ACHConfirmations.dat --force
```

## Seguridad (importante)
Este repo contiene la BD con datos reales de proveedores, el hash del admin y la clave
JWT. **Mantenlo privado.** Tras clonar en producción, cambia la contraseña de admin.
