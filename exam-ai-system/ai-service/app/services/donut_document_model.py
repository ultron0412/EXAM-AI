from __future__ import annotations

from functools import lru_cache
import importlib
import logging
from pathlib import Path
import re
from typing import Any

logger = logging.getLogger(__name__)


class DonutDocumentModel:
    def __init__(self, model_name: str, max_length: int = 768):
        self.model_name = model_name
        self.max_length = max_length
        self._tokenizer: Any | None = None
        self._image_processor: Any | None = None
        self._model: Any | None = None
        self._torch: Any | None = None
        self._device = "cpu"

    def _load(self) -> None:
        if self._model is not None:
            return

        try:
            transformers = importlib.import_module("transformers")
            torch = importlib.import_module("torch")
        except Exception as exc:
            raise RuntimeError("transformers and torch are required for Donut document AI") from exc

        tokenizer_cls = getattr(transformers, "AutoTokenizer")
        image_processor_cls = getattr(transformers, "AutoImageProcessor", None) or getattr(
            transformers, "DonutImageProcessor", None
        )
        model_classes = [
            cls
            for cls in (
                getattr(transformers, "AutoModelForImageTextToText", None),
                getattr(transformers, "VisionEncoderDecoderModel", None),
            )
            if cls is not None
        ]
        if image_processor_cls is None or not model_classes:
            raise RuntimeError("Installed transformers version does not support Donut image models")

        self._torch = torch
        self._tokenizer = tokenizer_cls.from_pretrained(self.model_name)
        self._image_processor = image_processor_cls.from_pretrained(self.model_name)
        model_load_error: Exception | None = None
        for model_cls in model_classes:
            try:
                self._model = model_cls.from_pretrained(self.model_name)
                break
            except Exception as exc:
                model_load_error = exc
        if self._model is None:
            raise RuntimeError(f"Unable to load Donut model {self.model_name}") from model_load_error

        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model.to(self._device)
        self._model.eval()
        logger.info("Loaded Donut document model %s on %s", self.model_name, self._device)

    def extract_text_from_path(self, file_path: str, prompt: str, max_pages: int) -> str:
        path = Path(file_path)
        if not path.exists():
            return ""

        try:
            self._load()
            pages = self._load_images(path, max_pages=max_pages)
            chunks = [self._extract_text_from_image(image, prompt) for image in pages]
            return "\n".join(chunk for chunk in chunks if chunk).strip()
        except Exception as exc:
            logger.warning("Donut extraction failed for %s: %s", path, exc)
            return ""

    def _load_images(self, path: Path, max_pages: int) -> list[Any]:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            return self._render_pdf_pages(path, max_pages=max_pages)
        if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            image_mod = importlib.import_module("PIL.Image")
            with image_mod.open(path) as image:
                return [image.convert("RGB")]
        return []

    def _render_pdf_pages(self, path: Path, max_pages: int) -> list[Any]:
        fitz = importlib.import_module("fitz")
        image_mod = importlib.import_module("PIL.Image")

        images: list[Any] = []
        with fitz.open(str(path)) as document:
            page_limit = min(len(document), max(max_pages, 1))
            for page_index in range(page_limit):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image = image_mod.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                images.append(image)
        return images

    def _extract_text_from_image(self, image: Any, prompt: str) -> str:
        if (
            self._model is None
            or self._tokenizer is None
            or self._image_processor is None
            or self._torch is None
        ):
            raise RuntimeError("Donut model is not loaded")

        inputs = self._image_processor(image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(self._device)
        decoder_input_ids = self._tokenizer(
            prompt,
            add_special_tokens=False,
            return_tensors="pt",
        ).input_ids.to(self._device)

        generate_kwargs = {
            "decoder_input_ids": decoder_input_ids,
            "max_length": self.max_length,
            "early_stopping": True,
            "use_cache": True,
        }
        if self._tokenizer.pad_token_id is not None:
            generate_kwargs["pad_token_id"] = self._tokenizer.pad_token_id
        if self._tokenizer.eos_token_id is not None:
            generate_kwargs["eos_token_id"] = self._tokenizer.eos_token_id

        with self._torch.no_grad():
            outputs = self._model.generate(pixel_values=pixel_values, **generate_kwargs)

        decoded = self._tokenizer.batch_decode(outputs, skip_special_tokens=False)[0]
        return self._clean_decoded_text(decoded)

    def _clean_decoded_text(self, text: str) -> str:
        cleaned = text
        for token in (
            getattr(self._tokenizer, "eos_token", None),
            getattr(self._tokenizer, "pad_token", None),
        ):
            if token:
                cleaned = cleaned.replace(token, " ")
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned


@lru_cache(maxsize=2)
def get_donut_document_model(model_name: str, max_length: int) -> DonutDocumentModel:
    return DonutDocumentModel(model_name=model_name, max_length=max_length)
