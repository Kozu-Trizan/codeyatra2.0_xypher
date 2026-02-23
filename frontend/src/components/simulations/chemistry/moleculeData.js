/**
 * Molecule data for the Chemistry simulation.
 *
 * Each entry contains the XYZ structure string, atom coordinates,
 * molecular info, and interactive questions for students.
 */
export const MOLECULE_DATA = {
  H2O: {
    formula: "H\u2082O",
    geometry: "Bent",
    bondAngle: "104.5\u00b0",
    polarity: "Polar",
    hybridization: "sp\u00b3",
    format: "xyz",
    structure: `3
Water molecule
O  0.000  0.000  0.000
H  0.757  0.586  0.000
H -0.757  0.586  0.000`,
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.757, y: 0.586, z: 0 },
      { element: "H", x: -0.757, y: 0.586, z: 0 },
    ],
    questions: [
      { id: "h2o_angle", text: "What is the bond angle in water?", type: "numeric", correctAnswer: 104.5, unit: "degrees" },
      { id: "h2o_polarity", text: "Is water polar or nonpolar?", type: "choice", options: ["Polar", "Nonpolar"], correctAnswer: "Polar" },
      { id: "h2o_geometry", text: "What is the molecular geometry?", type: "choice", options: ["Linear", "Bent", "Trigonal Planar", "Tetrahedral"], correctAnswer: "Bent" },
    ],
  },

  CH4: {
    formula: "CH\u2084",
    geometry: "Tetrahedral",
    bondAngle: "109.5\u00b0",
    polarity: "Nonpolar",
    hybridization: "sp\u00b3",
    format: "xyz",
    structure: `5
Methane molecule
C  0.000  0.000  0.000
H  0.629  0.629  0.629
H -0.629 -0.629  0.629
H -0.629  0.629 -0.629
H  0.629 -0.629 -0.629`,
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.629, y: 0.629, z: 0.629 },
      { element: "H", x: -0.629, y: -0.629, z: 0.629 },
      { element: "H", x: -0.629, y: 0.629, z: -0.629 },
      { element: "H", x: 0.629, y: -0.629, z: -0.629 },
    ],
    questions: [
      { id: "ch4_angle", text: "What is the H-C-H bond angle in methane?", type: "numeric", correctAnswer: 109.5 },
      { id: "ch4_geometry", text: "What is the molecular geometry?", type: "choice", options: ["Linear", "Bent", "Trigonal Planar", "Tetrahedral"], correctAnswer: "Tetrahedral" },
      { id: "ch4_polarity", text: "Is methane polar or nonpolar?", type: "choice", options: ["Polar", "Nonpolar"], correctAnswer: "Nonpolar" },
    ],
  },

  CO2: {
    formula: "CO\u2082",
    geometry: "Linear",
    bondAngle: "180\u00b0",
    polarity: "Nonpolar",
    hybridization: "sp",
    format: "xyz",
    structure: `3
Carbon dioxide
O -1.160  0.000  0.000
C  0.000  0.000  0.000
O  1.160  0.000  0.000`,
    atoms: [
      { element: "O", x: -1.16, y: 0, z: 0 },
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.16, y: 0, z: 0 },
    ],
    questions: [
      { id: "co2_angle", text: "What is the O-C-O bond angle?", type: "numeric", correctAnswer: 180 },
      { id: "co2_geometry", text: "What is the molecular geometry?", type: "choice", options: ["Linear", "Bent", "Trigonal Planar", "Tetrahedral"], correctAnswer: "Linear" },
    ],
  },

  NH3: {
    formula: "NH\u2083",
    geometry: "Trigonal Pyramidal",
    bondAngle: "107\u00b0",
    polarity: "Polar",
    hybridization: "sp\u00b3",
    format: "xyz",
    structure: `4
Ammonia molecule
N  0.000  0.000  0.000
H  0.000  0.940  0.000
H  0.814 -0.470  0.000
H -0.814 -0.470  0.000`,
    atoms: [
      { element: "N", x: 0, y: 0, z: 0 },
      { element: "H", x: 0, y: 0.94, z: 0 },
      { element: "H", x: 0.814, y: -0.47, z: 0 },
      { element: "H", x: -0.814, y: -0.47, z: 0 },
    ],
    questions: [
      { id: "nh3_geometry", text: "What is the molecular geometry?", type: "choice", options: ["Linear", "Bent", "Trigonal Pyramidal", "Tetrahedral"], correctAnswer: "Trigonal Pyramidal" },
      { id: "nh3_polarity", text: "Is ammonia polar or nonpolar?", type: "choice", options: ["Polar", "Nonpolar"], correctAnswer: "Polar" },
    ],
  },
};
