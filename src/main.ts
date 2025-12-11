import { Emulator } from "./c8/Emulator";

window.addEventListener('load', () => {
   const container = document.getElementById('app');
   if (container) {
      const emulator = new Emulator(container);
      emulator.run().catch(console.error);
   }
})