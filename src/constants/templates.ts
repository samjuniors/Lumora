export const PRESET_TEMPLATES = [
  {
    id: "ielts_writing_t1",
    label: "IELTS Academic Writing Task 1",
    title: "IELTS Academic Writing Task 1",
    subject: "IELTS Writing",
    description: "Summarize, describe or explain the information in your own words.",
    instructions: "Write at least 150 words. You should spend about 20 minutes on this task.",
    timeLimitMinutes: 20,
    rubric: [
      { name: "Task Achievement", description: "Addressing the requirements of the task.", weight: 20 },
      { name: "Coherence and Cohesion", description: "Logical organization and clear progression.", weight: 20 },
      { name: "Lexical Resource", description: "Range of vocabulary and accuracy.", weight: 20 },
      { name: "Grammatical Range", description: "Use of complex sentences and error-free structures.", weight: 20 },
      { name: "Spelling & Punctuation", description: "Accuracy in technical mechanics of writing.", weight: 20 }
    ]
  },
  {
    id: "ielts_writing_t2",
    label: "IELTS Academic Writing Task 2",
    title: "IELTS Academic Writing Task 2",
    subject: "IELTS Writing",
    description: "Write an essay in response to a point of view, argument or problem.",
    instructions: "Write at least 250 words. You should spend about 40 minutes on this task.",
    timeLimitMinutes: 40,
    rubric: [
      { name: "Task Response", description: "Fully addressing all parts of the task.", weight: 20 },
      { name: "Coherence and Cohesion", description: "Logical organization and clear progression.", weight: 20 },
      { name: "Lexical Resource", description: "Range of vocabulary and accuracy.", weight: 20 },
      { name: "Grammatical Range", description: "Use of complex sentences and error-free structures.", weight: 20 },
      { name: "Argument Strength", description: "Depth of logical reasoning and support for ideas.", weight: 20 }
    ]
  },
  {
    id: "book_review_1",
    label: "Advanced Book Review",
    title: "Critical Book Analysis",
    subject: "Literature",
    description: "Write a comprehensive review and critical analysis of a recent book you've read.",
    instructions: "Discuss themes, character development, and narrative structure.",
    timeLimitMinutes: 60,
    rubric: [
      { name: "Analysis Depth", description: "Quality of thematic analysis.", weight: 20 },
      { name: "Writing Style", description: "Clarity, tone, and engagement.", weight: 20 },
      { name: "Structure", description: "Introduction, body, and conclusion.", weight: 20 },
      { name: "Critical Perspective", description: "Originality and strength of unique arguments.", weight: 20 },
      { name: "Evidence & Usage", description: "Effective use of quotes and examples from text.", weight: 20 }
    ]
  },
  {
    id: "maya_duo_master",
    label: "Maya 3D Master (Duo Mission)",
    title: "Maya 3D Modeling Masterclass",
    subject: "3D Maya Modeling",
    description: "A comprehensive dual-phase mission: Technical Mesh Assessment followed by a Theoretical PDF Breakdown of production pipelines.",
    instructions: "Complete both the technical modeling test and the theoretical process presentation.",
    isBonus: true,
    isDuoBonus: true,
    testInstructions: "Technical Mesh Assessment: Submit high-res screenshots of your project in (1) Grayscale Shaded view to show silhouette clarity, and (2) Wireframe (Quads) view to show topology flow. Focus on Medium-Poly detail for assets/weapons.",
    testEntryFee: 30,
    testReward: 100,
    testPenalty: 50,
    testRubric: [
      { name: "Topology Flow", description: "Check for clean edge-loops, all-quads construction, and absence of N-gons.", weight: 20 },
      { name: "Silhouette & Form", description: "Evaluate the fidelity of the asset against standard product proportions.", weight: 20 },
      { name: "Poly-Efficiency", description: "Optimal use of geometry for a medium-detail asset without wasted spans.", weight: 15 },
      { name: "UV Mapping Foundation", description: "Logical UV shells, consistent texel density, and no major overlaps.", weight: 15 },
      { name: "Surface Normals", description: "Proper use of soft/hard edges and absence of shading artifacts.", weight: 15 },
      { name: "Technical Cleanup", description: "Freeze transforms, delete history, and correct pivot placement for engine export.", weight: 15 }
    ],
    presInstructions: "Modeling Theory & Pipeline PDF: Import a PDF containing your process breakdown. Must cover: Modular Kit theory, Environment scaling logic, and your asset pipeline from block-out to final mesh.",
    presEntryFee: 20,
    presReward: 70,
    presPenalty: 30,
    presRubric: [
      { name: "Concept Theory", description: "Depth of knowledge in Maya-specific modeling logic and modularity.", weight: 20 },
      { name: "Pipeline Clarity", description: "Clear explanation of the production steps and problem-solving.", weight: 20 },
      { name: "Documentation Quality", description: "Professional layout and clarity of the submitted PDF report.", weight: 15 },
      { name: "Comparative Analysis", description: "Critique of different modeling techniques used (e.g. Sub-D vs Boolean).", weight: 15 },
      { name: "Optimization Strategy", description: "Clear explanation of how geometry was managed for performance.", weight: 15 },
      { name: "Problem-Solving Log", description: "Detailed record of technical challenges overcome during the mission.", weight: 15 }
    ],
    timeLimitMinutes: 120,
    rubric: []
  }
];
