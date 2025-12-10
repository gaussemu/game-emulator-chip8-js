import { Emulator } from "./c8/Emulator";

window.addEventListener('load', () => {
   const container = document.getElementById('app');
   if (container) {
    Emulator.launch(container);
   }
})