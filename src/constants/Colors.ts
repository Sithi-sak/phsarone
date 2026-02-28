const redScale = {
  100: "#FAD6D3",
  200: "#F5ADA6",
  300: "#F1837A",
  400: "#EC5A4D",
  500: "#E73121",
  600: "#B9271A",
  700: "#8B1D14",
  800: "#5C140D",
  900: "#2E0A07",
};

const blueScale = {
  100: "#DBEAFE",
  500: "#3B82F6",
  700: "#1D4ED8",
};

const greenScale = {
  500: "#22C55E",
  600: "#16a34a",
};
const greyScale = {
  500: "#84888f",
 
};

const yellowScale = {
  50: "#FEFCE8",
  100: "#FEF9C3",
  200: "#FEF08A",
  300: "#FDE047",
  500: "#EAB308",
  600: "#CA8A04",
  700: "#A16207",
  800: "#854D0E",
  900: "#713F12",
};

export const Colors = {
  light: {
    navbg: "#fff",
    text: "#111827",
    background: "#FAFAFA",
    secondaryBackground: "#F0F0F0",
    card: "#FFFFFF",
    tint: redScale[500],
    tabIconDefault: "#84888f",
    primary: redScale[500],
    border: "#CED4DA",
    primaryButtonText: "#FFFFFF",
    warning: "#FFA500",
    info: blueScale[500],
    link: blueScale[500],
    error: redScale[500],
    success: greenScale[500],
    warningBackground: yellowScale[200],
  },
  dark: {
    navbg: "#182030",
    text: "#F9FAFB",
    background: "#111827",
    secondaryBackground: "#2C3E50",
    card: "#141d2e",
    tint: redScale[500],
    tabIconDefault: "#4B5563",
    primary: redScale[500],
    border: "#374151",
    primaryButtonText: "#FFFFFF",
    warning: "#FFA500",
    info: blueScale[500],
    link: blueScale[500],
    error: redScale[500],
    success: greenScale[500],
    warningBackground: yellowScale[600],

  },
  reds: redScale,
  blues: blueScale,
  greens: greenScale,
  yellows: yellowScale,
  gray: greyScale,
};
