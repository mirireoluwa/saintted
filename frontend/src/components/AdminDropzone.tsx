import { useEffect, useRef, useState } from "react";
import "./AdminMedia.css";

type AdminDropzoneProps = {
  id: string;
  accept: string;
  /** "image" previews as a picture, "video" as a muted looping clip. */
  kind: "image" | "video";
  file: File | null;
  onFile: (file: File | null) => void;
  /** What is live right now (an already-uploaded file), shown until a new file is chosen. */
  currentUrl?: string | null;
  label?: string;
  hint?: string;
};

/** Drop a file here or click to browse. Shows a live preview of the chosen (or current) file. */
export function AdminDropzone({ id, accept, kind, file, onFile, currentUrl, label, hint }: AdminDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = objectUrl || currentUrl || null;
  const matches = (f: File) => f.type.startsWith(kind + "/");

  const take = (f: File | undefined | null) => {
    if (f && matches(f)) onFile(f);
  };

  const sizeLabel = file ? `${(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2)} MB` : null;

  return (
    <div className="dz">
      {label ? (
        <label className="dz__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div
        className={`dz__zone${over ? " dz__zone--over" : ""}${previewUrl ? " dz__zone--has" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
      >
        <button
          type="button"
          className="dz__thumb"
          onClick={() => inputRef.current?.click()}
          aria-label={previewUrl ? `Replace ${kind}` : `Choose ${kind}`}
        >
          {previewUrl ? (
            <span className="dz__preview">
              {kind === "image" ? (
                <img src={previewUrl} alt="" />
              ) : (
                <video src={previewUrl} muted loop playsInline autoPlay />
              )}
              {file ? <span className="dz__badge">new</span> : <span className="dz__badge dz__badge--live">live</span>}
            </span>
          ) : (
            <span className="dz__empty" aria-hidden>
              <span className="dz__plus">+</span>
            </span>
          )}
        </button>
        <div className="dz__body">
          <p className="dz__title">
            {file ? file.name : previewUrl ? `Current ${kind}` : `Drop ${kind === "image" ? "an image" : "a video"} here`}
          </p>
          <p className="dz__sub">
            {file ? sizeLabel : "or click to browse"}
            {hint && !file ? ` · ${hint}` : ""}
          </p>
          <div className="dz__actions">
            <button type="button" className="admin-btn" onClick={() => inputRef.current?.click()}>
              {previewUrl ? "Replace" : "Choose file"}
            </button>
            {file ? (
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  onFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Undo
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          className="dz__input"
          type="file"
          accept={accept}
          onChange={(e) => take(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
