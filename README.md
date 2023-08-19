# [WIP] HarmonyScape

## Technologies Used:

- Next.js
- TypeScript
- Tailwind
- Rough.js
- Keystrokes

## Currently you are able to:

- Canvas Movement
  - Pan the canvas 'infinitely' using middle mouse
  - Zoom in/out the canvas relative to the mouse with ctrl+wheel
  - Scroll up and down the canvas
  - Resize the canvas and persist elements
- Drawing
  - Draw lines, rectangles, circles/ellipses
  - Switch between drawing tools
- Selection
  - Move shapes with the selection tool
  - Move multiple shapes if shift+drag
  - Drag multi-select
  - Selection and bounding box UI
  - Different ways of detecting if an element can be moved
    - By perimeter for transparent elements when no element is currently selected
    - By entire bounding region when muliple elements are selected   
- Shortcuts
  - Undo/Redo using shortcuts working for drawing, moving single and multiple shapes
- Other
  - Use a pretty custom info logger for development

## Upcoming

- Selection
  - Resize shapes
  - Rotate shapes
- Shortcuts
  - Copy/Paste
- Tools
  - Text
  - Pencil with perfect-freehand.js
  - Images
- Menus and UI
  - Toolbar
  - Edit shape properties
  - Context Menu
- Music-Related Libraries
  - vexflow.js for displaying sheet music
  - jzz.js for midi
