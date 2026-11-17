document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop() || "Index.html";
  document.querySelectorAll(".nav-btn, .nav-cta").forEach((link) => {
    const target = link.getAttribute("href");
    if (target === currentPage) {
      link.classList.add("active");
    }
  });
});

//scroll

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href^="index.html"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        history.pushState(null, null, this.getAttribute("href"));
      }
    });
  });
});

const practiceModules = {
  limits: {
    title: "Limits & Continuity",
    questions: [
    ]
  },
  derivatives: {
    title: "Derivatives",
    questions: [
      { prompt: "Find \\( f'(3) \\) if \\( f(x) = x^2 \\).", answers: ["6"] },
      { prompt: "Find the derivative: \\( \\frac{d}{dx}(3x^2) \\)", answers: ["6x"] },
      { prompt: "Find the derivative: \\( \\frac{d}{dx}(x^3) \\)", answers: ["3x²", "3x^2"] }
    ]
  },
  "derivative-applications": {
    title: "Applications of Derivatives",
    questions: [
      { prompt: "For \\( f(x) = x^2 - 4x \\), at what \\( x \\)-value does the minimum occur?", answers: ["2"] },
      { prompt: "Find the critical point of \\( f(x) = x^2 - 6x \\). Give the \\( x \\)-value.", answers: ["3"] },
      { prompt: "A position is given by \\( s(t) = t^2 + 2t \\). Find the velocity at \\( t = 3 \\).", answers: ["8"] }
    ]
  },
  integrals: {
    title: "Integrals",
    questions: [
      { prompt: "Find: \\( \\int 2x\\,dx \\)", answers: ["x² + C", "x^2+c", "x²+c", "x^2 + c"] },
      { prompt: "Evaluate: \\( \\int_0^3 2x\\,dx \\)", answers: ["9"] },
      { prompt: "Find: \\( \\int 3x^2\\,dx \\)", answers: ["x³ + C", "x^3+c", "x³+c", "x^3 + c"] }
    ]
  },
  "integral-applications": {
    title: "Applications of Integrals",
    questions: [
      { prompt: "Find the area under \\( y = x \\) from \\( x = 0 \\) to \\( x = 2 \\).", answers: ["2"] },
      { prompt: "Evaluate the accumulated area: \\( \\int_0^2 3\\,dx \\)", answers: ["6"] },
      { prompt: "Find the area under \\( y = 2x \\) from \\( x = 0 \\) to \\( x = 3 \\).", answers: ["9"] }
    ]
  }
};

function getPracticeModuleKey(sectionTitle, declaredModule) {
  const knownModules = Object.keys(practiceModules);
  if (declaredModule) {
    const key = declaredModule.trim().toLowerCase();
    if (knownModules.includes(key)) return key;
    throw new Error(`Unknown module "${declaredModule}". Use one of: ${knownModules.join(", ")}.`);
  }

  const title = sectionTitle.toLowerCase();
  if (title.includes("limit")) return "limits";
  if (title.includes("derivative") && title.includes("application")) return "derivative-applications";
  if (title.includes("derivative")) return "derivatives";
  if (title.includes("integral") && title.includes("application")) return "integral-applications";
  if (title.includes("integral")) return "integrals";
  throw new Error(`Cannot map section "${sectionTitle}" to a practice module. Add a "% module: key" directive.`);
}

function parseEnumerateItems(source, startAt = 0) {
  const beginPattern = /\\begin\{enumerate\}/g;
  beginPattern.lastIndex = startAt;
  const begin = beginPattern.exec(source);
  if (!begin) {
    throw new Error("An enumerate list is missing.");
  }

  const tokens = /\\begin\{enumerate\}|\\end\{enumerate\}|\\item\b|%[^\r\n]*/g;
  tokens.lastIndex = beginPattern.lastIndex;
  let depth = 1;
  let itemStart = null;
  const items = [];
  let token;

  while ((token = tokens.exec(source))) {
    if (token[0][0] === "%") continue;

    if (token[0] === "\\begin{enumerate}") {
      depth += 1;
    } else if (token[0] === "\\end{enumerate}") {
      if (depth === 1) {
        if (itemStart !== null) items.push(source.slice(itemStart, token.index).trim());
        return items;
      }
      depth -= 1;
    } else if (depth === 1) {
      if (itemStart !== null) items.push(source.slice(itemStart, token.index).trim());
      itemStart = tokens.lastIndex;
    }
  }

  throw new Error("An enumerate list is not closed.");
}

function stripLatexComments(text) {
  return text.replace(/(^|[^\\])%[^\r\n]*/gm, "$1").trim();
}

function normalizeLatexAnswer(text) {
  return stripLatexComments(text)
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .replace(/[{}]/g, "");
}

function prepareSolutionForRendering(solution) {
  return stripLatexComments(solution)
    .replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, "")
    .replace(/\\item\b/g, "\n\nStep: ")
    .replace(/\\begin\{align\*?\}/g, "$$\\begin{aligned}")
    .replace(/\\end\{align\*?\}/g, "\\end{aligned}$$")
    .trim();
}

function renderMath(element) {
  if (!element || typeof renderMathInElement !== "function") return;

  try {
    renderMathInElement(element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  } catch (error) {
    console.error("Could not render quiz mathematics.", error);
  }
}

function parsePracticeProblems(texSource) {
  const sections = [...texSource.matchAll(/\\section\*?\s*\{([^}]+)\}/g)];
  if (sections.length === 0) {
    throw new Error("No LaTeX sections found. Add a section such as \\section*{Limits Practice}.");
  }

  const problemsByModule = {};
  sections.forEach((section, sectionIndex) => {
    const sectionStart = section.index + section[0].length;
    const nextSection = sections[sectionIndex + 1];
    const sectionBody = texSource.slice(sectionStart, nextSection ? nextSection.index : undefined);
    const declaredModule = sectionBody.match(/^\s*%+\s*module\s*:\s*([\w-]+)/im);
    const moduleKey = getPracticeModuleKey(
      section[1].trim(),
      declaredModule ? declaredModule[1] : null
    );
    const items = parseEnumerateItems(sectionBody);

    items.forEach((item, itemIndex) => {
      const choicesMarker = /%[ \t]*choices\b/i.exec(item);
      const answerMatch = /%[ \t]*answer\s*:\s*([^\r\n]+)/i.exec(item);
      const solutionMarker = /%[ \t]*solution\b/i.exec(item);
      const problemNumber = itemIndex + 1;
      if (!choicesMarker || !answerMatch || !solutionMarker) {
        throw new Error(
          `Problem ${problemNumber} in "${section[1]}" needs % Choices, % answer:, and % solution markers.`
        );
      }

      const answer = answerMatch[1].trim();
      const prompt = stripLatexComments(item.slice(0, choicesMarker.index))
        .replace(/\\label\{[^}]*\}/g, "")
        .trim();
      if (!prompt) {
        throw new Error(`Problem ${problemNumber} in "${section[1]}" has no question text.`);
      }

      const choices = parseEnumerateItems(item, choicesMarker.index + choicesMarker[0].length)
        .map(stripLatexComments)
        .filter(Boolean);
      if (choices.length < 2) {
        throw new Error(`Problem ${problemNumber} in "${section[1]}" needs at least two choices.`);
      }

      const matchingChoice = choices.findIndex(
        choice => normalizeLatexAnswer(choice) === normalizeLatexAnswer(answer)
      );
      const correctChoiceIndex = /^\d+$/.test(answer)
        ? (matchingChoice >= 0 ? matchingChoice : Number(answer) - 1)
        : matchingChoice;
      if (correctChoiceIndex < 0 || correctChoiceIndex >= choices.length) {
        throw new Error(`Problem ${problemNumber} in "${section[1]}" has an answer that does not match a choice.`);
      }

      const solution = prepareSolutionForRendering(
        item.slice(solutionMarker.index + solutionMarker[0].length)
      );
      if (!solution) {
        throw new Error(`Problem ${problemNumber} in "${section[1]}" has an empty solution.`);
      }

      const question = {
        prompt,
        choices,
        correctChoiceIndex,
        answers: [choices[correctChoiceIndex]],
        solution
      };
      (problemsByModule[moduleKey] ||= []).push(question);
    });
  });

  if (Object.keys(problemsByModule).length === 0) {
    throw new Error("No \\item problems were found in the LaTeX file.");
  }
  return problemsByModule;
}

let loadedEquationSource = null;
let loadedEquationModules = [];
const builtInPracticeQuestions = new Map(
  Object.entries(practiceModules).map(([moduleKey, module]) => [moduleKey, module.questions.slice()])
);

async function loadExternalEquations() {
  const status = document.getElementById("equation-source-status");
  if (!status) return;

  try {
    const sourceUrl = new URL("equation.tex", window.location.href);
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`equation.tex returned HTTP ${response.status}.`);
    }

    const texSource = await response.text();
    const importedProblems = parsePracticeProblems(texSource);
    if (!importedProblems.limits || importedProblems.limits.length === 0) {
      throw new Error('No problems were found in the "Limits Practice" section.');
    }

    const sourceChanged = loadedEquationSource !== texSource;
    if (sourceChanged) {
      loadedEquationModules.forEach(moduleKey => {
        practiceModules[moduleKey].questions = builtInPracticeQuestions.get(moduleKey).slice();
        delete practiceResults[moduleKey];
      });
    }

    Object.entries(importedProblems).forEach(([moduleKey, questions]) => {
      practiceModules[moduleKey].questions = questions;
      if (sourceChanged) {
        practiceResults[moduleKey] = questions.map(() => null);
      }
    });
    if (sourceChanged) {
      loadedEquationModules = Object.keys(importedProblems);
      loadedEquationSource = texSource;
    }
    status.textContent = "";
    status.hidden = true;
    status.classList.remove("equation-source-error", "equation-source-success");
    return true;
  } catch (error) {
    console.error("Could not import practice problems from equation.tex.", error);
    status.hidden = false;
    status.textContent = window.location.protocol === "file:"
      ? "Could not import equation.tex from a file URL. Open the Website folder through VS Code Live Server or another local web server."
      : `Could not import equation.tex: ${error.message}`;
    status.classList.remove("equation-source-success");
    status.classList.add("equation-source-error");
    return false;
  }
}

let activePracticeModule = null;
let activeQuestionIndex = 0;
const practiceResults = {};

function openStudyPanel(panelKey) {
  const sections = {
    practice: "drawer-practice",
    lessons: "drawer-lessons",
    progress: "drawer-progress"
  };
  const sectionId = sections[panelKey];
  if (!sectionId) {
    console.error(`Unknown study panel: ${panelKey}`);
    return;
  }

  Object.values(sections).forEach(id => {
    document.getElementById(id).classList.toggle("hidden", id !== sectionId);
  });
  document.getElementById("study-drawer-title").textContent =
    panelKey === "practice" ? "Practice Sets" : panelKey === "lessons" ? "Lessons" : "Progress Tracker";
  document.getElementById("drawer-backdrop").classList.remove("hidden");
  document.getElementById("study-drawer").classList.remove("hidden");
  document.body.classList.add("dialog-open");

  if (panelKey === "progress") renderProgressTracker();
  document.getElementById("study-drawer").querySelector(".icon-close-btn").focus();
}

function closeStudyPanel() {
  document.getElementById("study-drawer").classList.add("hidden");
  document.getElementById("drawer-backdrop").classList.add("hidden");
  if (document.getElementById("quiz-overlay").classList.contains("hidden")) {
    document.body.classList.remove("dialog-open");
  }
}

async function openPracticeModule(moduleKey) {
  if ((moduleKey === "limits" || loadedEquationModules.includes(moduleKey)) &&
      !await loadExternalEquations()) {
    return;
  }

  const module = practiceModules[moduleKey];
  if (!module) {
    console.error(`Unknown practice module: ${moduleKey}`);
    return;
  }
  if (module.questions.length === 0) {
    console.error(`The ${module.title} quiz has no questions.`);
    return;
  }

  activePracticeModule = moduleKey;
  activeQuestionIndex = 0;
  if (!practiceResults[moduleKey] || practiceResults[moduleKey].length !== module.questions.length) {
    practiceResults[moduleKey] = module.questions.map(() => null);
  }
  closeStudyPanel();
  document.getElementById("quiz-overlay").classList.remove("hidden");
  document.body.classList.add("dialog-open");
  document.getElementById("quiz-module-title").textContent = module.title;
  renderQuizQuestion();
  const firstAnswer = document.querySelector('#quiz-choice-list input') ||
    document.getElementById("quiz-answer-input");
  firstAnswer.focus();
}

function closePracticeModule() {
  document.getElementById("quiz-overlay").classList.add("hidden");
  activePracticeModule = null;
  document.body.classList.remove("dialog-open");
  openStudyPanel("practice");
}

function renderQuizQuestion() {
  const module = practiceModules[activePracticeModule];
  const question = module.questions[activeQuestionIndex];
  const previousResult = practiceResults[activePracticeModule][activeQuestionIndex];
  const input = document.getElementById("quiz-answer-input");
  const choiceList = document.getElementById("quiz-choice-list");
  const feedback = document.getElementById("quiz-feedback");
  const indicators = document.getElementById("quiz-question-indicators");

  const questionText = document.getElementById("quiz-question-text");
  questionText.textContent = question.prompt;
  renderMath(questionText);
  document.getElementById("quiz-question-count").textContent =
    `Question ${activeQuestionIndex + 1} of ${module.questions.length}`;
  const hasChoices = Array.isArray(question.choices) && question.choices.length > 0;
  input.hidden = hasChoices;
  choiceList.hidden = !hasChoices;
  choiceList.replaceChildren();
  input.value = previousResult && !hasChoices ? previousResult.answer : "";

  if (hasChoices) {
    question.choices.forEach((choice, index) => {
      const label = document.createElement("label");
      label.className = "quiz-choice-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "quiz-choice";
      radio.value = String(index);
      radio.checked = Boolean(previousResult && previousResult.choiceIndex === index);
      if (previousResult && index === question.correctChoiceIndex) {
        label.classList.add("correct");
      }
      if (previousResult && index === previousResult.choiceIndex && !previousResult.correct) {
        label.classList.add("incorrect");
      }
      radio.addEventListener("change", () => {
        choiceList.querySelectorAll(".quiz-choice-option").forEach(option => {
          option.classList.remove("selected", "correct", "incorrect");
        });
        label.classList.add("selected");
      });

      const choiceText = document.createElement("span");
      choiceText.className = "quiz-choice-text";
      choiceText.textContent = choice;
      label.classList.toggle("selected", radio.checked);
      label.append(radio, choiceText);
      choiceList.append(label);
    });
    renderMath(choiceList);
  }

  feedback.textContent = previousResult ? previousResult.feedback : "";
  feedback.style.color = previousResult ? (previousResult.correct ? "#16a34a" : "#dc2626") : "";
  renderMath(feedback);

  const showSolutionButton = document.getElementById("quiz-show-solution");
  const solution = document.getElementById("quiz-solution");
  showSolutionButton.classList.toggle("hidden", !previousResult || !question.solution);
  solution.hidden = !previousResult || !previousResult.solutionVisible || !question.solution;
  solution.textContent = question.solution || "";
  if (!solution.hidden) renderMath(solution);

  indicators.replaceChildren();
  practiceResults[activePracticeModule].forEach((result, index) => {
    const indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = "quiz-question-indicator";
    if (result) indicator.classList.add(result.correct ? "correct" : "incorrect");
    if (index === activeQuestionIndex) indicator.classList.add("current");
    indicator.textContent = String(index + 1);
    indicator.setAttribute("aria-label", result
      ? `Question ${index + 1}: ${result.correct ? "correct" : "incorrect"}`
      : `Question ${index + 1}: not answered`);
    indicator.setAttribute("aria-current", index === activeQuestionIndex ? "step" : "false");
    indicator.addEventListener("click", () => {
      activeQuestionIndex = index;
      renderQuizQuestion();
    });
    indicators.append(indicator);
  });

  document.querySelectorAll(".quiz-nav-btn").forEach((button, index) => {
    button.disabled = index === 0
      ? activeQuestionIndex === 0
      : activeQuestionIndex === module.questions.length - 1;
  });
}

function changeQuizQuestion(offset) {
  const questionCount = practiceModules[activePracticeModule].questions.length;
  const nextIndex = activeQuestionIndex + offset;
  if (nextIndex < 0 || nextIndex >= questionCount) return;

  activeQuestionIndex = nextIndex;
  renderQuizQuestion();
}

function submitQuizAnswer(event) {
  event.preventDefault();
  const input = document.getElementById("quiz-answer-input");
  const feedback = document.getElementById("quiz-feedback");
  const question = practiceModules[activePracticeModule].questions[activeQuestionIndex];
  const selectedChoice = question.choices
    ? document.querySelector('#quiz-choice-list input[name="quiz-choice"]:checked')
    : null;
  let answer = input.value.trim();
  let choiceIndex = null;
  let correct;
  let expectedAnswer;

  if (question.choices) {
    if (!selectedChoice) {
      feedback.style.color = "#dc2626";
      feedback.textContent = "Please select an answer.";
      return;
    }

    choiceIndex = Number(selectedChoice.value);
    answer = question.choices[choiceIndex];
    correct = choiceIndex === question.correctChoiceIndex;
    expectedAnswer = question.choices[question.correctChoiceIndex];
  } else {
    if (!answer) {
      feedback.style.color = "#dc2626";
      feedback.textContent = "Please enter an answer.";
      return;
    }

    const normalizedAnswer = answer.toLowerCase().replace(/\s+/g, "");
    correct = question.numericAnswer !== undefined
      ? Number.isFinite(Number(answer)) && Math.abs(Number(answer) - question.numericAnswer) < 0.0001
      : question.answers.some(
        acceptedAnswer => acceptedAnswer.toLowerCase().replace(/\s+/g, "") === normalizedAnswer
      );
    expectedAnswer = question.numericAnswer !== undefined
      ? String(question.numericAnswer)
      : question.answers[0];
  }

  const previousResult = practiceResults[activePracticeModule][activeQuestionIndex];
  const result = {
    answer,
    choiceIndex,
    correct,
    solutionVisible: Boolean(previousResult && previousResult.solutionVisible),
    attempts: previousResult ? [...previousResult.attempts, answer] : [answer],
    feedback: correct
      ? "✓ Correct! Your answer has been recorded."
      : `✗ Incorrect. Expected: ${expectedAnswer}`
  };
  practiceResults[activePracticeModule][activeQuestionIndex] = result;
  renderQuizQuestion();
  const focusTarget = question.choices
    ? document.querySelector('#quiz-choice-list input:checked') || document.querySelector('#quiz-choice-list input')
    : input;
  focusTarget.focus();
}

function showCurrentSolution() {
  if (!activePracticeModule) return;

  const question = practiceModules[activePracticeModule].questions[activeQuestionIndex];
  const result = practiceResults[activePracticeModule][activeQuestionIndex];
  if (!question.solution || !result) return;

  result.solutionVisible = true;
  const solution = document.getElementById("quiz-solution");
  solution.textContent = question.solution;
  solution.hidden = false;
  renderMath(solution);
  requestAnimationFrame(() => {
    solution.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadExternalEquations();

  const answerForm = document.getElementById("quiz-answer-form");
  if (answerForm) answerForm.addEventListener("submit", submitQuizAnswer);

  const showSolutionButton = document.getElementById("quiz-show-solution");
  if (showSolutionButton) showSolutionButton.addEventListener("click", showCurrentSolution);
  renderMath(document.body);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!document.getElementById("quiz-overlay").classList.contains("hidden")) {
      closePracticeModule();
    } else if (!document.getElementById("study-drawer").classList.contains("hidden")) {
      closeStudyPanel();
    }
  });
});

function renderProgressTracker() {
  const progressList = document.getElementById("progress-topic-list");
  const summary = document.getElementById("progress-summary");
  progressList.replaceChildren();

  let answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  Object.entries(practiceModules).forEach(([key, module]) => {
    const results = practiceResults[key] || module.questions.map(() => null);
    const correct = results.filter(result => result && result.correct).length;
    const incorrect = results.filter(result => result && !result.correct).length;
    answeredCount += correct + incorrect;
    correctCount += correct;
    incorrectCount += incorrect;

    const item = document.createElement("article");
    item.className = "progress-topic-item";
    const title = document.createElement("h3");
    title.textContent = module.title;
    const detail = document.createElement("p");
    detail.textContent = `${correct + incorrect} of ${module.questions.length} answered · ${correct} correct · ${incorrect} incorrect`;
    item.append(title, detail);
    progressList.append(item);
  });

  summary.textContent = `${answeredCount} answered · ${correctCount} correct · ${incorrectCount} incorrect`;
}