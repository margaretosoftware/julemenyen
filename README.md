# Julemenyen - Christmas Market Menu

Sistema de menú dinámico para el mercado de navidad que se actualiza automáticamente desde Google Sheets.

## 📁 Archivos del proyecto

- **html-no.html** - Versión del menú en noruego
- **html-en.html** - Versión del menú en inglés
- **menu.js** - Script que carga los datos desde Google Sheets y renderiza el menú

## 🚀 Cómo usar

### 1. Publica tu Google Spreadsheet como CSV

Para que el script pueda leer los datos, debes publicar tu hoja de cálculo:

1. Abre tu spreadsheet: https://docs.google.com/spreadsheets/d/1yjhrRr1-ac2V74ihbnOjVJ38k9kJkRCU7i7GCssZijA/edit
2. Ve a **Archivo > Compartir > Publicar en la web**
3. Selecciona la hoja correcta (Sheet1 o la que contiene los datos)
4. Formato: **CSV**
5. Haz clic en **Publicar**

### 2. Sube el repositorio a GitHub

```bash
# Añade todos los archivos
git add .

# Crea el primer commit
git commit -m "Initial commit: Christmas menu system"

# Crea el repositorio en GitHub (desde la web) y luego:
git remote add origin https://github.com/TU_USUARIO/julemenyen.git
git branch -M main
git push -u origin main
```

### 3. Actualiza las URLs en los archivos HTML

En ambos archivos HTML ([html-no.html](html-no.html) y [html-en.html](html-en.html)), reemplaza `TU_USUARIO` con tu usuario de GitHub:

```html
<!-- Antes -->
<script src="https://raw.githubusercontent.com/TU_USUARIO/julemenyen/main/menu.js?v=1"></script>

<!-- Después (ejemplo) -->
<script src="https://raw.githubusercontent.com/pablouser/julemenyen/main/menu.js?v=1"></script>
```

### 4. Pega el HTML en WordPress

1. Copia el contenido completo de [html-no.html](html-no.html)
2. En WordPress, edita la página noruega
3. Pega el código en un bloque HTML personalizado
4. Repite el proceso con [html-en.html](html-en.html) para la página en inglés

## ✏️ Cómo editar el menú

Tu cliente puede editar el menú directamente desde Google Sheets:

https://docs.google.com/spreadsheets/d/1yjhrRr1-ac2V74ihbnOjVJ38k9kJkRCU7i7GCssZijA/edit

### Columnas del spreadsheet:

- **category** / **category_en**: Categoría del plato (Drikke, Matretter, Dessert, Annet)
- **item_name** / **item_name_en**: Nombre del plato
- **description** / **description_en**: Descripción del plato
- **price**: Precio (solo número, sin moneda)
- **currency**: Moneda (NOK)
- **allergens** / **allergens_en**: Alérgenos separados por comas
- **tags** / **tags_en**: Etiquetas descriptivas
- **available**: TRUE para mostrar, FALSE para ocultar
- **sold_out**: TRUE para marcar como agotado
- **order**: Orden de aparición (números más bajos aparecen primero)
- **image_url**: URL de la imagen (opcional)

### Cómo funciona la actualización automática

**IMPORTANTE**: El HTML contiene el menú **pre-renderizado** con los datos del CSV. Esto significa:

1. **Primera carga**: El usuario ve inmediatamente el menú renderizado en el HTML
2. **Verificación automática**: El script `menu.js` descarga el CSV y compara con el HTML actual
3. **Actualización si hay cambios**: Si detecta diferencias, regenera el HTML automáticamente
4. **Sin cambios**: Si el CSV está igual, no hace nada (carga instantánea)

#### Ventajas de este sistema:
- ✅ **Carga instantánea**: No hay pantalla en blanco mientras carga el CSV
- ✅ **SEO friendly**: Los motores de búsqueda ven el contenido completo
- ✅ **Actualización automática**: Los cambios en Google Sheets se reflejan sin tocar el código
- ✅ **Fallback**: Si falla la conexión al CSV, el menú original sigue visible

## 🔄 Cache Breaker

Si realizas cambios en [menu.js](menu.js) y quieres forzar que los navegadores descarguen la nueva versión:

1. Edita los archivos HTML
2. Incrementa el número en `?v=1` a `?v=2`, luego `?v=3`, etc.

```html
<!-- Versión 1 -->
<script src="https://raw.githubusercontent.com/tu-usuario/julemenyen/main/menu.js?v=1"></script>

<!-- Versión 2 (después de hacer cambios) -->
<script src="https://raw.githubusercontent.com/tu-usuario/julemenyen/main/menu.js?v=2"></script>
```

## 📋 Platos con "Take Home"

Los siguientes platos están marcados como "Take Home" en el código:

- Rømmegrøt med spekemat
- Elgburger i briochebrød
- Julepølse i lefse
- Vegansk linsegryte
- Riskrem med rød saus
- Pepperkake og småkaker
- Karamellpudding
- Barnemeny: Pølse med potetmos

Si necesitas añadir o quitar platos de esta lista, edita el objeto `TAKEHOME_ITEMS_NO` en [menu.js](menu.js):

```javascript
var TAKEHOME_ITEMS_NO = {
  "Rømmegrøt med spekemat": true,
  "Nuevo plato para llevar": true,
  // ...
};
```

## 🎨 Características del menú

### Diseño estilo Egon.no:
- **Items con foto**: Se muestran como tarjetas en grid de 3 columnas (arriba)
- **Items sin foto**: Se listan en formato texto centrado con max-width 900px (abajo)
- **Cards sutiles**: Fondo semi-transparente con efecto hover
- **Responsive**: 3 columnas → 2 columnas (tablet) → 1 columna (móvil)

### Filtros interactivos:
- **Categorías**: Dropdown para filtrar por tipo (Drikke, Matretter, Dessert, Annet)
- **Allergier**: Modal con checkboxes que extrae alérgenos únicos del CSV
- **Take Home**: Filtro temporalmente oculto (puede activarse en el futuro)

### Características visuales:
- **Formato de precio**: Muestra "100,-" en lugar de "100 NOK"
- **Alérgenos en cursiva**: Formato `<em>Allergener: melk, gluten</em>`
- **UTSOLGT overlay**: Centrado y grande sobre la imagen para items con foto
- **UTSOLGT badge**: Badge inline para items sin foto
- **Allergen badge**: Badge pequeño en esquina superior izquierda de fotos
- **Colores**: Paleta consistente (#0b3b5a azul oscuro, #f5edda beige, #0d4d6d modal)

## 🛠️ Soporte técnico

Si necesitas hacer cambios en el código JavaScript o los estilos, los archivos están en este repositorio. Después de cualquier cambio:

1. Haz commit: `git add . && git commit -m "Descripción del cambio"`
2. Push: `git push`
3. Incrementa el cache breaker en los HTML (`?v=X`)
4. Actualiza los HTML en WordPress si es necesario

## 📞 Contacto

Para cualquier duda sobre el funcionamiento del sistema, contacta con el desarrollador.
