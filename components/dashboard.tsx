"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Clock3,
  CookingPot,
  House,
  ImagePlus,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Target,
  Timer,
  Trash2,
  Upload,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MealOption, MealPlanResponse } from "@/lib/meal-plan";

const STORAGE_KEY = "mealmind-onboarding";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 10;
const MAX_IMAGE_DIMENSION = 512;
const JPEG_QUALITY = 0.78;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type CompressedImage = {
  id: string;
  name: string;
  dataUrl: string;
  compressedSize: number;
  width: number;
  height: number;
};

type CookingSession = {
  meal: MealOption;
  stepIndex: number;
  remainingSeconds: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
};

type SavedProfile = {
  age: number;
  weight: number;
  height: number;
  activityLevel: string;
  fitnessGoal: string;
  allergies: string[];
  dietType: string;
  excludedFoods: string;
  cuisinePreference: string;
  cookTimeBudget: string;
  bmi: number;
  completedAt: string;
};

function subscribeToProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getProfileSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function parseProfile(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as SavedProfile;
  } catch {
    return null;
  }
}

function formatGoal(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This image could not be compressed."));
    }, "image/jpeg", JPEG_QUALITY);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("This image could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Image compression is unavailable in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl: await blobToDataUrl(blob),
    compressedSize: blob.size,
    width,
    height,
  };
}

export function Dashboard() {
  const profile = parseProfile(useSyncExternalStore(subscribeToProfile, getProfileSnapshot, () => null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [cookingSession, setCookingSession] = useState<CookingSession | null>(null);

  useEffect(() => {
    if (!cookingSession?.timerRunning) return;

    const updateTimer = () => {
      setCookingSession((current) => {
        if (!current?.timerRunning || !current.timerEndsAt) return current;
        const remainingSeconds = Math.max(0, Math.ceil((current.timerEndsAt - Date.now()) / 1000));
        return {
          ...current,
          remainingSeconds,
          timerRunning: remainingSeconds > 0,
          timerEndsAt: remainingSeconds > 0 ? current.timerEndsAt : null,
        };
      });
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [cookingSession?.timerRunning]);

  async function addImages(files: File[]) {
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can select up to ${MAX_IMAGES} images. Remove ${images.length + files.length - MAX_IMAGES} before adding this selection.`);
      return;
    }

    const invalidType = files.find((file) => !ACCEPTED_TYPES.includes(file.type));
    if (invalidType) {
      setError(`${invalidType.name} is not a JPG, PNG, or WebP image.`);
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      setError(`${oversizedFile.name} is larger than 10 MB.`);
      return;
    }

    setIsCompressing(true);
    setError("");
    try {
      const compressedImages = await Promise.all(files.map(compressImage));
      setImages((current) => [...current, ...compressedImages].slice(0, MAX_IMAGES));
      setMealPlan(null);
    } catch (compressionError) {
      setError(compressionError instanceof Error ? compressionError.message : "One or more images could not be compressed.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addImages(selectedFiles);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!isCompressing && !isSubmitting) void addImages(Array.from(event.dataTransfer.files));
  }

  function removeImage(imageId: string) {
    setImages((current) => current.filter((image) => image.id !== imageId));
    setMealPlan(null);
    setError("");
  }

  function startCooking(meal: MealOption) {
    setCookingSession({
      meal,
      stepIndex: 0,
      remainingSeconds: meal.instructions[0].timerSeconds,
      timerRunning: false,
      timerEndsAt: null,
    });
  }

  function goToCookingStep(stepIndex: number) {
    setCookingSession((current) => {
      if (!current) return null;
      const nextIndex = Math.max(0, Math.min(stepIndex, current.meal.instructions.length - 1));
      return {
        ...current,
        stepIndex: nextIndex,
        remainingSeconds: current.meal.instructions[nextIndex].timerSeconds,
        timerRunning: false,
        timerEndsAt: null,
      };
    });
  }

  function toggleCookingTimer() {
    setCookingSession((current) => {
      if (!current) return null;
      const timerSeconds = current.meal.instructions[current.stepIndex].timerSeconds;
      if (!timerSeconds) return current;

      if (current.timerRunning) {
        return { ...current, timerRunning: false, timerEndsAt: null };
      }

      const remainingSeconds = current.remainingSeconds || timerSeconds;
      return {
        ...current,
        remainingSeconds,
        timerRunning: true,
        timerEndsAt: Date.now() + remainingSeconds * 1000,
      };
    });
  }

  function resetCookingTimer() {
    setCookingSession((current) => {
      if (!current) return null;
      return {
        ...current,
        remainingSeconds: current.meal.instructions[current.stepIndex].timerSeconds,
        timerRunning: false,
        timerEndsAt: null,
      };
    });
  }

  async function submitPhoto(event: FormEvent) {
    event.preventDefault();
    if (!images.length) {
      setError("Add at least one fridge image before submitting.");
      return;
    }

    if (!profile) {
      setError("Complete onboarding before requesting meal options.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((image) => image.dataUrl),
          profile,
        }),
      });
      const result = await response.json() as MealPlanResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Meal options could not be generated.");
      }

      setMealPlan(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Meal options could not be generated.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell mx-auto min-h-dvh w-full max-w-[420px] overflow-x-hidden shadow-2xl">
      <header className="mobile-masthead">
        <div className="dashboard-brand">
          <span className="brand-mark"><ChefHat size={19} /></span>
          <span>MealMind</span>
        </div>
        <div className="nav-day">
          <span>Today</span>
          <strong suppressHydrationWarning>{new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}</strong>
        </div>
      </header>

      <div className="dashboard-content">
        <header className="dashboard-heading">
          <p className="eyebrow">Daily kitchen check-in</p>
          <h1>What&apos;s in your fridge today?</h1>
          <p>Add up to ten clear photos so MealMind can see ingredients across your fridge and pantry.</p>
        </header>

        <div className="dashboard-layout">
          <section className="upload-tool" aria-labelledby="fridge-upload-title">
            <div className="tool-heading">
              <div>
                <span className="tool-step">01</span>
                <h2 id="fridge-upload-title">Kitchen photos</h2>
              </div>
              <span className="private-badge"><ShieldCheck size={15} /> Secure vision analysis</span>
            </div>

            <form onSubmit={submitPhoto} aria-busy={isSubmitting}>
              <input
                ref={fileInputRef}
                id="fridge-photo"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={isCompressing || isSubmitting || images.length >= MAX_IMAGES}
                onChange={handleFileChange}
              />

              {images.length ? (
                <div className="image-selection">
                  <div className="thumbnail-grid">
                    {images.map((image, index) => (
                      <div className="image-thumbnail" key={image.id}>
                        <Image src={image.dataUrl} alt={`Selected kitchen image ${index + 1}: ${image.name}`} fill unoptimized sizes="120px" className="object-cover" />
                        <span className="thumbnail-index">{index + 1}</span>
                        <button type="button" className="thumbnail-delete" onClick={() => removeImage(image.id)} disabled={isCompressing || isSubmitting} aria-label={`Delete ${image.name}`} title="Delete image">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button type="button" className="add-thumbnail" onClick={() => fileInputRef.current?.click()} disabled={isCompressing || isSubmitting} aria-label="Add more images">
                        {isCompressing ? <LoaderCircle className="animate-spin" size={21} /> : <ImagePlus size={21} />}
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                  <div className="image-selection-meta" aria-live="polite">
                    <span><Check size={15} /> {images.length} of {MAX_IMAGES} ready</span>
                    <small>{(images.reduce((total, image) => total + image.compressedSize, 0) / 1024).toFixed(0)} KB compressed · 512px max</small>
                  </div>
                </div>
              ) : (
                <div
                  className={`upload-dropzone ${isDragging ? "is-dragging" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="upload-visual">
                    <Camera size={31} strokeWidth={1.7} />
                    <ImagePlus size={18} className="upload-plus" />
                  </div>
                  <strong>{isCompressing ? "Compressing images" : "Choose kitchen photos"}</strong>
                  <p>or drop up to ten here</p>
                  <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}><Upload size={17} /> Browse photos</button>
                  <small>JPG, PNG, or WebP · 10 images max · resized to 512px</small>
                </div>
              )}

              {error && <p className="upload-error" role="alert">{error}</p>}

              <button type="submit" className="button-primary submit-fridge" disabled={!images.length || !profile || isCompressing || isSubmitting}>
                {isSubmitting ? <><LoaderCircle className="animate-spin" size={18} /> Reading {images.length} {images.length === 1 ? "image" : "images"}</> : <>{mealPlan ? "Generate two new options" : "Create two meal options"} <ArrowRight size={18} /></>}
              </button>
            </form>
          </section>

          <aside className="profile-panel" aria-labelledby="profile-title">
            <div className="tool-heading compact">
              <div>
                <span className="tool-step">Your baseline</span>
                <h2 id="profile-title">Meal profile</h2>
              </div>
              <UserRound size={20} />
            </div>

            {profile ? (
              <div className="profile-facts">
                <div><Target size={18} /><span>Goal</span><strong>{formatGoal(profile.fitnessGoal)}</strong></div>
                <div><UtensilsCrossed size={18} /><span>Diet</span><strong>{profile.dietType}</strong></div>
                <div><Clock3 size={18} /><span>Cook time</span><strong>{profile.cookTimeBudget} min</strong></div>
                <div><span className="bmi-dot">BMI</span><span>Baseline</span><strong>{profile.bmi}</strong></div>
              </div>
            ) : (
              <div className="profile-empty">
                <p>No saved meal profile was found in this browser.</p>
                <Link href="/" className="button-secondary">Complete onboarding <ArrowRight size={17} /></Link>
              </div>
            )}

            {profile && (
              <div className="preference-note">
                <span>Flavor direction</span>
                <strong>{profile.cuisinePreference}</strong>
                <p>{profile.allergies.length ? `Avoiding ${profile.allergies.join(", ")}.` : "No recorded allergies."}</p>
              </div>
            )}
          </aside>
        </div>

        {mealPlan && (
          <section className="meal-results animate-in" aria-labelledby="meal-results-title">
            <div className="results-heading">
              <div>
                <p className="eyebrow">Built from what you have</p>
                <h2 id="meal-results-title">Two ways to make dinner</h2>
              </div>
              <span><Check size={16} /> Profile matched</span>
            </div>

            <div className="detected-ingredients">
              <strong>Seen in your fridge</strong>
              <div>
                {mealPlan.detectedIngredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}
              </div>
            </div>

            <div className="meal-options">
              {mealPlan.meals.map((meal, mealIndex) => (
                <article className="meal-option" key={`${meal.title}-${mealIndex}`}>
                  <div className="meal-number">0{mealIndex + 1}</div>
                  <header>
                    <p>{meal.totalTimeMinutes} min total</p>
                    <h3>{meal.title}</h3>
                    <span>{meal.description}</span>
                  </header>

                  <div className="nutrition-estimate">
                    <div className="nutrition-heading"><strong>Nutritional estimate</strong><span>Per serving</span></div>
                    <div className="macro-row" aria-label="Estimated nutrition per serving">
                      <div><strong>{meal.estimatedCalories}</strong><span>Calories</span></div>
                      <div><strong>{meal.nutrition.proteinGrams}g</strong><span>Protein</span></div>
                      <div><strong>{meal.nutrition.carbohydrateGrams}g</strong><span>Carbs</span></div>
                      <div><strong>{meal.nutrition.fatGrams}g</strong><span>Fat</span></div>
                    </div>
                  </div>

                  <button type="button" className="button-primary start-cooking" onClick={() => startCooking(meal)}>
                    <CookingPot size={19} /> Start step-by-step
                  </button>

                  <div className="recipe-section">
                    <h4>Ingredients</h4>
                    <ul>
                      {meal.ingredients.map((ingredient) => <li key={`${ingredient.name}-${ingredient.amount}`}><span>{ingredient.name}</span><strong>{ingredient.amount}</strong></li>)}
                    </ul>
                  </div>

                  <div className="recipe-section">
                    <h4>Recipe steps</h4>
                    <ol>
                      {meal.instructions.map((instruction, index) => <li key={`${index}-${instruction.text}`}><span>{index + 1}</span><p>{instruction.text}</p></li>)}
                    </ol>
                  </div>

                  <footer className="meal-notes">
                    <div><strong>Goal fit</strong><p>{meal.goalAlignment}</p></div>
                    <div><strong>Allergen check</strong><p>{meal.allergenNotes}</p></div>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <nav className="bottom-tab-bar fixed bottom-0 left-1/2 z-50 mx-auto w-full max-w-[420px] -translate-x-1/2" aria-label="Main navigation">
        <Link href="/dashboard" className="bottom-tab active" aria-current="page">
          <House size={21} />
          <span>Today</span>
        </Link>
        <button type="button" className="bottom-tab scan-tab" onClick={() => fileInputRef.current?.click()} disabled={isCompressing || isSubmitting || images.length >= MAX_IMAGES}>
          <ScanLine size={22} />
          <span>Scan</span>
        </button>
        <Link href="/" className="bottom-tab">
          <UserRound size={21} />
          <span>Profile</span>
        </Link>
      </nav>

      {cookingSession && (
        <section className="cooking-mode" role="dialog" aria-modal="true" aria-labelledby="cooking-meal-title">
          <header className="cooking-mode-header">
            <div>
              <span>Cooking now</span>
              <strong id="cooking-meal-title">{cookingSession.meal.title}</strong>
            </div>
            <button type="button" onClick={() => setCookingSession(null)} aria-label="Close cooking mode" title="Close cooking mode"><X size={22} /></button>
          </header>

          <div className="cooking-progress" aria-label={`Step ${cookingSession.stepIndex + 1} of ${cookingSession.meal.instructions.length}`}>
            {cookingSession.meal.instructions.map((instruction, index) => (
              <span key={`${index}-${instruction.text}`} className={index <= cookingSession.stepIndex ? "active" : ""} />
            ))}
          </div>

          <div className="cooking-step">
            <p className="eyebrow">Step {cookingSession.stepIndex + 1} of {cookingSession.meal.instructions.length}</p>
            <h2>{cookingSession.meal.instructions[cookingSession.stepIndex].text}</h2>

            {cookingSession.meal.instructions[cookingSession.stepIndex].timerSeconds > 0 ? (
              <div className={`step-timer ${cookingSession.remainingSeconds === 0 ? "timer-complete" : ""}`}>
                <div className="timer-label"><Timer size={18} /><span>{cookingSession.remainingSeconds === 0 ? "Timer complete" : cookingSession.timerRunning ? "Timer running" : "Step timer"}</span></div>
                <strong role="timer" aria-label={`${cookingSession.remainingSeconds} seconds remaining`}>{formatTimer(cookingSession.remainingSeconds)}</strong>
                <div className="timer-controls">
                  <button type="button" className="button-primary" onClick={toggleCookingTimer}>
                    {cookingSession.timerRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> {cookingSession.remainingSeconds === 0 ? "Restart" : "Start"}</>}
                  </button>
                  <button type="button" className="button-secondary" onClick={resetCookingTimer} aria-label="Reset timer" title="Reset timer"><RotateCcw size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="hands-on-step"><CookingPot size={20} /><span>Hands-on step</span></div>
            )}
          </div>

          <footer className="cooking-navigation">
            <button type="button" className="button-secondary" onClick={() => goToCookingStep(cookingSession.stepIndex - 1)} disabled={cookingSession.stepIndex === 0}>
              <ChevronLeft size={19} /> Previous
            </button>
            {cookingSession.stepIndex < cookingSession.meal.instructions.length - 1 ? (
              <button type="button" className="button-primary" onClick={() => goToCookingStep(cookingSession.stepIndex + 1)}>
                Next <ChevronRight size={19} />
              </button>
            ) : (
              <button type="button" className="button-primary" onClick={() => setCookingSession(null)}>
                Finish <Check size={19} />
              </button>
            )}
          </footer>
        </section>
      )}
    </main>
  );
}