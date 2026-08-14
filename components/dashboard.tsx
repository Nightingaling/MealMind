"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  ChefHat,
  Clock3,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  Upload,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MealPlanResponse } from "@/lib/meal-plan";

const STORAGE_KEY = "mealmind-onboarding";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

export function Dashboard() {
  const profile = parseProfile(useSyncExternalStore(subscribeToProfile, getProfileSnapshot, () => null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function choosePhoto(file?: File) {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setPhoto(file);
    setPreviewUrl(nextUrl);
    setError("");
    setMealPlan(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    choosePhoto(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    choosePhoto(event.dataTransfer.files?.[0]);
  }

  function removePhoto() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPhoto(null);
    setPreviewUrl(null);
    setMealPlan(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitPhoto(event: FormEvent) {
    event.preventDefault();
    if (!photo) {
      setError("Add a fridge photo before submitting.");
      return;
    }

    if (!profile) {
      setError("Complete onboarding before requesting meal options.");
      return;
    }

    const formData = new FormData();
    formData.append("image", photo);
    formData.append("profile", JSON.stringify(profile));
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        body: formData,
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
    <main className="dashboard-shell">
      <nav className="dashboard-nav" aria-label="Main navigation">
        <Link href="/" className="dashboard-brand" aria-label="MealMind home">
          <span className="brand-mark"><ChefHat size={19} /></span>
          <span>MealMind</span>
        </Link>
        <div className="nav-day">
          <span>Today</span>
          <strong>{new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}</strong>
        </div>
        <Link href="/" className="profile-link" title="View profile">
          <UserRound size={18} />
          <span>{profile?.fitnessGoal ? `${formatGoal(profile.fitnessGoal)} plan` : "Profile"}</span>
        </Link>
      </nav>

      <div className="dashboard-content">
        <header className="dashboard-heading">
          <p className="eyebrow">Daily kitchen check-in</p>
          <h1>What&apos;s in your fridge today?</h1>
          <p>Add one clear photo and MealMind will have the context for your next meal.</p>
        </header>

        <div className="dashboard-layout">
          <section className="upload-tool" aria-labelledby="fridge-upload-title">
            <div className="tool-heading">
              <div>
                <span className="tool-step">01</span>
                <h2 id="fridge-upload-title">Fridge photo</h2>
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
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="photo-preview">
                  <Image src={previewUrl} alt="Uploaded view of the inside of your fridge" fill unoptimized className="object-cover" />
                  <div className="preview-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()} title="Replace photo" disabled={isSubmitting}><RefreshCw size={18} /><span>Replace</span></button>
                    <button type="button" onClick={removePhoto} title="Remove photo" disabled={isSubmitting}><X size={18} /><span>Remove</span></button>
                  </div>
                  <div className="photo-details">
                    <span><Check size={15} /> Photo ready</span>
                    <small>{photo?.name} · {photo ? (photo.size / 1024 / 1024).toFixed(1) : 0} MB</small>
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
                  <strong>Choose a fridge photo</strong>
                  <p>or drop it here</p>
                  <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Browse photos</button>
                  <small>JPG, PNG, or WebP · 10 MB max</small>
                </div>
              )}

              {error && <p className="upload-error" role="alert">{error}</p>}

              <button type="submit" className="button-primary submit-fridge" disabled={!photo || !profile || isSubmitting}>
                {isSubmitting ? <><LoaderCircle className="animate-spin" size={18} /> Planning from your fridge</> : <>{mealPlan ? "Generate two new options" : "Create two meal options"} <ArrowRight size={18} /></>}
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

                  <div className="recipe-section">
                    <h4>Ingredients</h4>
                    <ul>
                      {meal.ingredients.map((ingredient) => <li key={`${ingredient.name}-${ingredient.amount}`}><span>{ingredient.name}</span><strong>{ingredient.amount}</strong></li>)}
                    </ul>
                  </div>

                  <div className="recipe-section">
                    <h4>Recipe steps</h4>
                    <ol>
                      {meal.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}><span>{index + 1}</span><p>{instruction}</p></li>)}
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
    </main>
  );
}