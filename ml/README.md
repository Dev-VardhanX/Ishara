# Ishara ML - Member A

Sign recognition (ISL, ASL), text-to-gloss, emotion detection. Training in PyTorch, export to ONNX.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Folders
```
src/        preprocess.py (shared spec), dataset, model, train, export
notebooks/  Colab / Kaggle notebooks
vocab/      vocab_v1.csv - the agreed vocabulary (150-300 signs per language)
models/     exported .onnx files + labels_*.json + model cards (via Git LFS)
data/       raw videos and keypoints (git-ignored, share via Drive)
```

## Deliveries
- End of Phase 1: dummy ONNX model with the correct input/output shape
- End of Phase 2: `isl_model.onnx` + `labels_isl.json`
- Phase 3: gloss and emotion models
- Phase 4: `asl_model.onnx` + `labels_asl.json`

Contract: `docs/contracts/model-contract.md`.
