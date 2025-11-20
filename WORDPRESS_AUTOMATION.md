# 🤖 WordPress Automation Setup

Este documento explica cómo configurar la actualización automática de las páginas de WordPress cada hora.

## 📋 Cómo funciona

El sistema usa **JSDOM** (DOM simulation en Node.js) para:

1. Cargar los archivos HTML locales (`html-no-local.html` y `html-en-local.html`)
2. Ejecutar `menu.js` que descarga el CSV de Google Sheets y renderiza todo
3. Extraer el HTML final ya renderizado (con datos actualizados)
4. Subir el contenido actualizado a WordPress **siempre**, sin comparaciones

**Ventaja**:
- Más ligero que Puppeteer (no requiere Chromium)
- Reutiliza toda la lógica de renderizado existente en JavaScript
- Actualiza siempre, asegurando que WordPress tiene la última versión

## 🔧 Configuración paso a paso

### 1. Crear GitHub Secrets

1. Ve a tu repositorio: https://github.com/margaretosoftware/julemenyen
2. Click en **Settings** (⚙️)
3. En el menú lateral: **Secrets and variables** → **Actions**
4. Crea estos dos secrets:

**Secret 1: WP_USERNAME**
- Click en **New repository secret**
- Nombre: `WP_USERNAME`
- Valor: Tu usuario de WordPress (probablemente `admin`)
- Click **Add secret**

**Secret 2: WP_PASSWORD**
- Click en **New repository secret**
- Nombre: `WP_PASSWORD`
- Valor: Tu contraseña de WordPress (la que usas para login normal)
- Click **Add secret**

### 2. Crear el workflow de GitHub Actions

El workflow ya está creado en `.github/workflows/update-wordpress.yml`, pero como tu token no tiene permisos para crear workflows, necesitas crearlo manualmente:

1. Ve a tu repositorio en GitHub
2. Click en **Actions** → **New workflow** → **set up a workflow yourself**
3. Copia el contenido de `.github/workflows/update-wordpress.yml` del repositorio local
4. Click **Commit changes**

### 3. Push del código

```bash
git add .
git commit -m "Add WordPress automation with Puppeteer

- Node.js script using Puppeteer to render pages with live data
- GitHub Actions workflow running every hour
- Extracts rendered HTML and updates WordPress via REST API

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

### 4. Probar el workflow

1. Ve a GitHub → Actions
2. Selecciona "Update WordPress Menu"
3. Click **Run workflow** para ejecutarlo manualmente
4. Verifica que se ejecuta sin errores

## 🔄 Frecuencia de actualización

El workflow se ejecuta **cada hora** (`cron: '0 * * * *'`).

Si quieres cambiar la frecuencia, edita `.github/workflows/update-wordpress.yml`:

```yaml
schedule:
  # Cada hora (actual)
  - cron: '0 * * * *'

  # Cada 30 minutos
  - cron: '*/30 * * * *'

  # Cada 2 horas
  - cron: '0 */2 * * *'

  # Cada 6 horas
  - cron: '0 */6 * * *'
```

## 🧪 Probar localmente

```bash
# Instala dependencias
npm install

# Configura usuario y contraseña de WordPress
export WP_USERNAME='admin'
export WP_PASSWORD='tu_contraseña_wordpress'

# Ejecuta el script
node update_wordpress.js

# O en una sola línea:
WP_USERNAME='admin' WP_PASSWORD='tu_contraseña' node update_wordpress.js
```

Output esperado:

```
============================================================
🎄 Julemenyen WordPress Auto-Updater
============================================================

============================================================
🇳🇴 Processing Norwegian page...
============================================================
🌐 Rendering html-no-local.html with Puppeteer...
✅ Rendered html-no-local.html (25000 chars)
📄 Fetching WordPress page 8498...
✅ Fetched page 8498 (25000 chars)
✅ Norwegian page is already up to date

============================================================
🇬🇧 Processing English page...
============================================================
🌐 Rendering html-en-local.html with Puppeteer...
✅ Rendered html-en-local.html (25000 chars)
📄 Fetching WordPress page 8500...
✅ Fetched page 8500 (25000 chars)
✅ English page is already up to date

============================================================
✅ Update process completed successfully
============================================================
```

## 📊 Flujo del sistema

```mermaid
graph TD
    A[GitHub Actions cada hora] --> B[Inicia JSDOM]
    B --> C[Carga html-no-local.html]
    C --> D[Ejecuta menu.js que descarga CSV]
    D --> E[menu.js renderiza HTML con datos actualizados]
    E --> F[Extrae HTML renderizado completo]
    F --> G[Actualiza WordPress via REST API]
    G --> H[Repite para html-en-local.html]
    H --> I[✅ Completado]
```

## 🛠️ Troubleshooting

### Error: "WP_PASSWORD not set"
Asegúrate de que los secrets `WP_USERNAME` y `WP_PASSWORD` están correctamente configurados en GitHub Settings → Secrets and variables → Actions.

### Error: "401 Unauthorized" o "rest_cannot_edit"
**Causa**: Credenciales incorrectas o usuario sin permisos de administrador.

**Solución**:
1. Verifica que tu usuario tiene rol **Administrator** en WordPress
2. Asegúrate de que la contraseña sea correcta (prueba hacer login en WordPress manualmente)
3. Si cambiaste la contraseña, actualiza el secret `WP_PASSWORD` en GitHub
4. Verifica que el username sea correcto en el secret `WP_USERNAME`

### Error: "404 Not Found"
Verifica que los Page IDs (8498 y 8500) son correctos en `update_wordpress.js`.

### Error: "fetch is not defined"
**Causa**: JSDOM no incluye la API `fetch()` por defecto.

**Solución**: Ya está resuelto en la última versión del código. El script ahora usa `node-fetch` como polyfill.

Si el error persiste:
1. Ejecuta `npm install` para instalar `node-fetch`
2. Verifica que `package.json` incluya `"node-fetch": "^2.7.0"`

### JSDOM no renderiza correctamente
Asegúrate de que los archivos `html-no-local.html` y `html-en-local.html` existen y usan `./menu.js` (no la CDN).

### El workflow no se ejecuta
GitHub Actions puede tener un delay de hasta 5-10 minutos. Para forzar ejecución:
1. Ve a Actions
2. Selecciona "Update WordPress Menu"
3. Click "Run workflow"

## 🔐 Seguridad

- **NUNCA** commitees el Application Password directamente en el código
- Usa siempre GitHub Secrets para credenciales sensibles
- El Application Password solo tiene permisos para editar páginas

## 🎉 Resultado final

Una vez configurado:

✅ **GitHub Actions se ejecuta cada hora**
✅ **JSDOM renderiza las páginas con datos actualizados del CSV**
✅ **WordPress se actualiza automáticamente SIEMPRE (sin comparaciones)**
✅ **Tu cliente solo edita Google Sheets**

Los cambios aparecerán en WordPress en máximo 1 hora automáticamente. 🚀
