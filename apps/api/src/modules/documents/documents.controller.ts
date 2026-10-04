import multer from "multer";
import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok } from "@/common/utils/apiResponse";
import { ValidationError } from "@/common/errors/AppError";
import { documentsService } from "./documents.service";
import { uploadDocumentSchema, listDocumentsQuerySchema } from "./documents.types";

// Memory storage: files here are KYC scans and study material documents,
// not video — buffering in memory then writing once is simpler than
// juggling multer's disk-storage filename callbacks, and caps out via
// the fileSize limit below regardless.
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  // Study materials also reasonably include office documents/slides —
  // KYC uploads (address proof) never use these, but nothing here checks
  // docType vs mimetype, so the broader allow-list applies to both.
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — study materials (slides/scans) run larger than a single KYC photo
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("File type not allowed. Use an image, PDF, Word, PowerPoint, or text file."));
      return;
    }
    cb(null, true);
  },
});

export const documentsController = {
  uploadMiddleware: upload.single("file"),

  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError("No file uploaded");
    const input = uploadDocumentSchema.parse(req.body);
    const doc = await documentsService.upload(input, req.file, req.user!);
    created(res, doc);
  }),

  list: asyncHandler(async (req, res) => {
    const query = listDocumentsQuerySchema.parse(req.query);
    const docs = await documentsService.list(query.ownerType, query.ownerId, req.user!);
    ok(res, docs);
  }),

  download: asyncHandler(async (req, res) => {
    const { doc, filePath, stream } = await documentsService.getForDownload(req.params.documentId!, req.user!);
    if (stream) {
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
      stream.pipe(res);
      return;
    }
    res.download(filePath!, doc.originalName);
  }),

  remove: asyncHandler(async (req, res) => {
    await documentsService.remove(req.params.documentId!, req.user!);
    noContent(res);
  }),
};
