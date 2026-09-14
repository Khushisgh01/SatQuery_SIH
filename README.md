# SatQuery AI 🛰️

**An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries**

SatQuery AI is an agentic, query-driven assistant that lets users analyze satellite and remote-sensing imagery using natural language — instead of forcing them to understand GIS workflows, sensor characteristics, or model selection. A user uploads one or more images and asks a question in plain text; the system interprets the query, selects the right remote-sensing specialist model(s) for the job, executes them, and returns an evidence-grounded textual and visual answer.

This repository contains the **frontend application** — the interactive GUI through which users upload imagery, submit queries, and view results.

---

## 📖 Overview

Most remote-sensing AI tools are built for a single predefined task — land-cover classification, object detection, visual question answering, or change detection — and expect the user to already know which model or workflow to use. SatQuery AI removes that barrier by acting as an **agentic controller**: it interprets the intent behind a natural-language query, checks the compatibility of the supplied imagery, routes the request to one or more specialist models, and fuses their outputs into a single, auditable answer.

Many real-world questions can't be answered from a single optical image alone. Relevant information is often spread across:

- **Multiple sensing modalities** — optical/multispectral imagery carries spectral and contextual detail, while Synthetic Aperture Radar (SAR) carries complementary structural information and works day or night, through cloud cover.
- **Multiple points in time** — detecting and explaining change requires comparing two spatially corresponding observations of the same area.

SatQuery AI is designed around these realities, treating single-image, cross-modal, and bi-temporal analysis as first-class, natural-language-driven workflows.

---

## 🎯 Supported Input Configurations

| Configuration | Description |
|---|---|
| **Single image** | One optical/multispectral or SAR image — for captioning, visual question answering, and text-guided region grounding |
| **Cross-modal pair** | Co-registered optical/multispectral + SAR images of the same area — for joint, complementary information extraction |
| **Bi-temporal pair** | Two spatially corresponding images of the same area at different times — for change detection, change description, and change-based VQA |

**Supported formats:** GeoTIFF / TIFF for geospatial imagery. PNG/JPEG are accepted only for evaluation against public benchmark datasets.

---

## ✨ Core Capabilities

- **Natural-language visual question answering** on single remote-sensing images
- **Scene captioning / description** and **text-guided region grounding**, so results can be pinpointed spatially, not just described in text
- **Multitemporal change understanding** — change description and change-based VQA over bi-temporal image pairs
- **Optical–SAR fusion analysis** — combining complementary spectral and structural information from co-registered pairs to answer queries neither modality could answer alone
- **Agentic task orchestration** — the controller classifies the query, validates image modality/format/compatibility, selects and sequences the right specialist model(s), and combines their outputs automatically
- **Evidence-grounded responses** — answers are returned with visual evidence, confidence estimates, and an auditable execution summary (selected task, models/tools used, key parameters)
- **Downloadable reports** summarizing each query, its inputs, and its results

---

## 🧠 How It Works (Agentic Pipeline)

1. **Query interpretation** — the controller parses the natural-language query and classifies the requested task (VQA, captioning, grounding, change analysis, cross-modal fusion, etc.)
2. **Input validation** — the number, modality, format, and metadata of the uploaded image(s) are checked for compatibility with the requested task
3. **Model/tool selection** — one or more specialist remote-sensing models are selected from a predefined registry based on the task and input configuration
4. **Execution** — the selected workflow is configured with only its permitted parameters and run
5. **Output fusion** — textual and spatial outputs are combined, a confidence estimate is produced, and supporting visual evidence is attached
6. **Audit trail** — an execution summary is returned alongside the answer, listing the task, the model(s)/tool(s) invoked, and the parameters used

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React |
| Build tool | Vite |
| Linting | Oxlint |
| Remote-sensing adaptation | Vision-language model(s) fine-tuned/adapted on remote-sensing imagery and text |
| Specialist models | VQA/captioning, grounding, change-understanding, and optical–SAR fusion components, invoked via the agentic controller |

*(Update the specialist-model and backend rows above once those services are integrated into this repository or linked from a companion backend repo.)*

---

## 📚 Data & Benchmarks

- **Adaptation dataset:** BigEarthNet — co-registered Sentinel-1 SAR and Sentinel-2 multispectral imagery with text annotations, used to adapt image–text representations to multisensor remote-sensing data.
- **Evaluation benchmarks:**
  - **VRSBench** and **RSVQA** — single-image captioning, grounding, and visual question answering
  - **CDVQA** — multitemporal, change-based visual question answering

All datasets used for training/fine-tuning and evaluation are openly available.

---

## 📁 Project Structure

```
SatQuery_SIH/
├── public/            # Static assets
├── src/                # Application source code
├── .env.example        # Environment variable template
├── index.html           # HTML entry point
├── vite.config.js        # Vite configuration
├── package.json           # Dependencies and scripts
└── .oxlintrc.json          # Lint configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (bundled with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Khushisgh01/SatQuery_SIH.git
   cd SatQuery_SIH
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Populate `.env` with the values your setup requires (e.g. backend/API base URL, model-service endpoints, API keys).

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` by default.

### Build for production

```bash
npm run build
```

### Lint the code

```bash
npm run lint
```

---

## 🔑 Environment Variables

See `.env.example` for the complete, current list. Typical variables include:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend/agentic-controller API |
| `VITE_API_KEY` | API key for the backend or any external imagery/data provider |

---

## 🗺️ Roadmap

- [ ] Image upload with automatic modality/format/metadata validation
- [ ] Query interface with task-aware suggestions
- [ ] Single-image VQA and captioning/grounding views
- [ ] Bi-temporal change-analysis viewer with change maps
- [ ] Optical–SAR paired-analysis viewer
- [ ] Execution-trace/audit panel (task, models used, parameters)
- [ ] Downloadable query reports
