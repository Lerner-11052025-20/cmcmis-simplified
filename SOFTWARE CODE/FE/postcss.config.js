// postcss.config.js  —  Runs Tailwind + Autoprefixer over the project CSS.
//   Tailwind:     turns @tailwind base/components/utilities directives
//                 into the actual CSS for the classes we used.
//   Autoprefixer: adds vendor prefixes so the result works on older
//                 evergreen browsers without us thinking about it.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
