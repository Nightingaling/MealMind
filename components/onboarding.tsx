"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  HeartPulse,
  Leaf,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "mealmind-onboarding";
const STORAGE_EVENT = "mealmind-profile-change";

const steps = [
  { label: "Body", title: "Start with your baseline", kicker: "Your body" },
  { label: "Goals", title: "Where are you heading?", kicker: "Your direction" },
  { label: "Food", title: "Make every plate feel yours", kicker: "Your table" },
  { label: "Kitchen", title: "Plan for real life", kicker: "Your routine" },
];

const activityOptions = [
  { value: "sedentary", title: "Mostly seated", detail: "Desk days, little structured exercise" },
  { value: "light", title: "Lightly active", detail: "Movement or training 1-3 days a week" },
  { value: "moderate", title: "Active", detail: "Training 3-5 days a week" },
  { value: "very-active", title: "Very active", detail: "Hard training 6-7 days a week" },
];

const goalOptions = [
  { value: "cut", title: "Cut", detail: "Lose body fat with a sustainable calorie deficit", icon: Target },
  { value: "maintain", title: "Maintain", detail: "Keep your weight steady and feel well fueled", icon: HeartPulse },
  { value: "bulk", title: "Bulk", detail: "Build muscle with a controlled calorie surplus", icon: Sparkles },
];

const dietOptions = ["Omnivore", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Mediterranean"];
const commonAllergies = ["Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten", "Shellfish", "Soy"];
const cuisineOptions = ["Mediterranean", "East Asian", "Mexican", "Indian", "Middle Eastern", "No preference"];
const cookTimeOptions = [
  { value: "15", title: "15 min", detail: "Quick assembly" },
  { value: "30", title: "30 min", detail: "Weeknight pace" },
  { value: "45", title: "45 min", detail: "Room to cook" },
  { value: "60+", title: "60+ min", detail: "Weekend project" },
];

type FormData = {
  age: string;
  weight: string;
  height: string;
  activityLevel: string;
  fitnessGoal: string;
  allergies: string[];
  dietType: string;
  excludedFoods: string;
  cuisinePreference: string;
  cookTimeBudget: string;
};

type SavedProfile = Omit<FormData, "age" | "weight" | "height"> & {
  age: number;
  weight: number;
  height: number;
  bmi: number;
  completedAt: string;
};

const initialForm: FormData = {
  age: "",
  weight: "",
  height: "",
  activityLevel: "",
  fitnessGoal: "",
  allergies: [],
  dietType: "",
  excludedFoods: "",
  cuisinePreference: "",
  cookTimeBudget: "",
};

function getBmi(weight: string, height: string) {
  const weightValue = Number(weight);
  const heightMeters = Number(height) / 100;

  if (!weightValue || !heightMeters) return null;
  return weightValue / heightMeters ** 2;
}

function getBmiLabel(bmi: number) {
  if (bmi < 18.5) return "Below standard range";
  if (bmi < 25) return "Standard range";
  if (bmi < 30) return "Above standard range";
  return "Well above standard range";
}

function subscribeToProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
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

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-2 text-sm font-semibold text-red-700">{children}</p>;
}

function Choice({
  selected,
  title,
  detail,
  icon,
  onClick,
  compact = false,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  icon?: ReactNode;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`choice ${selected ? "choice-selected" : ""} ${compact ? "choice-compact" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {icon && <span className="choice-icon">{icon}</span>}
      <span className="min-w-0 text-left">
        <span className="block font-bold text-ink">{title}</span>
        {detail && <span className="mt-1 block text-sm leading-5 text-muted">{detail}</span>}
      </span>
      <span className="choice-check" aria-hidden="true">
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customAllergy, setCustomAllergy] = useState("");
  const savedProfile = parseProfile(useSyncExternalStore(subscribeToProfile, getProfileSnapshot, () => null));
  const bmi = getBmi(form.weight, form.height);

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      const age = Number(form.age);
      const weight = Number(form.weight);
      const height = Number(form.height);
      if (!age || age < 13 || age > 100) nextErrors.age = "Enter an age from 13 to 100.";
      if (!weight || weight < 30 || weight > 300) nextErrors.weight = "Enter a weight from 30 to 300 kg.";
      if (!height || height < 120 || height > 230) nextErrors.height = "Enter a height from 120 to 230 cm.";
    }

    if (currentStep === 1) {
      if (!form.activityLevel) nextErrors.activityLevel = "Choose your usual activity level.";
      if (!form.fitnessGoal) nextErrors.fitnessGoal = "Choose a fitness goal.";
    }

    if (currentStep === 2 && !form.dietType) nextErrors.dietType = "Choose the diet pattern closest to yours.";

    if (currentStep === 3) {
      if (!form.cuisinePreference) nextErrors.cuisinePreference = "Choose a cuisine preference.";
      if (!form.cookTimeBudget) nextErrors.cookTimeBudget = "Choose your usual cooking time.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function toggleAllergy(allergy: string) {
    const allergies = form.allergies.includes(allergy)
      ? form.allergies.filter((item) => item !== allergy)
      : [...form.allergies, allergy];
    updateField("allergies", allergies);
  }

  function addCustomAllergy(event: FormEvent) {
    event.preventDefault();
    const value = customAllergy.trim();
    if (!value) return;
    if (!form.allergies.some((item) => item.toLowerCase() === value.toLowerCase())) {
      updateField("allergies", [...form.allergies, value]);
    }
    setCustomAllergy("");
  }

  function finishOnboarding() {
    if (!validateStep(3) || !bmi) return;

    const profile: SavedProfile = {
      ...form,
      age: Number(form.age),
      weight: Number(form.weight),
      height: Number(form.height),
      bmi: Number(bmi.toFixed(1)),
      completedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(STORAGE_EVENT));
    router.push("/dashboard");
  }

  function startOver() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(STORAGE_EVENT));
    setForm(initialForm);
    setStep(0);
    setErrors({});
  }

  return (
    <main className="app-shell mx-auto min-h-dvh w-full max-w-[420px] overflow-x-hidden shadow-2xl">
      <aside className="visual-panel">
        <div className="visual-image">
          <Image
            src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1600&q=85"
            alt="A colorful bowl filled with grains, vegetables, and greens"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 42vw"
            className="object-cover"
          />
        </div>
        <div className="visual-scrim" />
        <div className="brand-lockup">
          <span className="brand-mark"><ChefHat size={22} /></span>
          <span>MealMind</span>
        </div>
        <div className="visual-copy">
          <p className="eyebrow text-white/75">Food that fits</p>
          <p>Good planning starts with knowing who is coming to the table.</p>
        </div>
      </aside>

      <section className="form-panel">
        {savedProfile ? (
          <Completion profile={savedProfile} onReset={startOver} />
        ) : (
          <div className="form-wrap">
            <header>
              <div className="mobile-brand">
                <span className="brand-mark"><ChefHat size={18} /></span>
                <span>MealMind</span>
              </div>
              <div className="step-meta">
                <span>Step {step + 1} of {steps.length}</span>
                <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="progress-track" aria-label={`Onboarding progress: step ${step + 1} of ${steps.length}`}>
                <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </div>
              <div className="step-labels" aria-label="Onboarding steps">
                {steps.map((item, index) => (
                  <span key={item.label} className={index <= step ? "active" : ""}>{item.label}</span>
                ))}
              </div>
            </header>

            <form onSubmit={(event) => event.preventDefault()} className="step-form">
              <div className="step-heading">
                <p className="eyebrow">{steps[step].kicker}</p>
                <h1>{steps[step].title}</h1>
                <p>We use these details to shape portions, ingredients, and recipes around your day.</p>
              </div>

              {step === 0 && (
                <div className="animate-in space-y-5">
                  <div>
                    <label className="field-label" htmlFor="age">Age</label>
                    <div className="input-unit">
                      <input id="age" inputMode="numeric" type="number" min="13" max="100" placeholder="28" value={form.age} onChange={(event) => updateField("age", event.target.value)} />
                      <span>years</span>
                    </div>
                    <FieldError>{errors.age}</FieldError>
                  </div>
                  <div className="two-column">
                    <div>
                      <label className="field-label" htmlFor="weight">Weight</label>
                      <div className="input-unit">
                        <input id="weight" inputMode="decimal" type="number" min="30" max="300" step="0.1" placeholder="72" value={form.weight} onChange={(event) => updateField("weight", event.target.value)} />
                        <span>kg</span>
                      </div>
                      <FieldError>{errors.weight}</FieldError>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="height">Height</label>
                      <div className="input-unit">
                        <input id="height" inputMode="decimal" type="number" min="120" max="230" placeholder="175" value={form.height} onChange={(event) => updateField("height", event.target.value)} />
                        <span>cm</span>
                      </div>
                      <FieldError>{errors.height}</FieldError>
                    </div>
                  </div>
                  <div className={`bmi-strip ${bmi ? "bmi-ready" : ""}`}>
                    <div className="bmi-icon"><HeartPulse size={22} /></div>
                    <div>
                      <span className="block text-xs font-bold uppercase text-muted">Calculated BMI</span>
                      <span className="bmi-value">{bmi ? bmi.toFixed(1) : "--"}</span>
                    </div>
                    <p>{bmi ? getBmiLabel(bmi) : "Add weight and height to calculate"}</p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="animate-in space-y-7">
                  <fieldset>
                    <legend className="field-label">Daily activity</legend>
                    <div className="choice-grid two">
                      {activityOptions.map((option) => (
                        <Choice key={option.value} {...option} selected={form.activityLevel === option.value} onClick={() => updateField("activityLevel", option.value)} compact />
                      ))}
                    </div>
                    <FieldError>{errors.activityLevel}</FieldError>
                  </fieldset>
                  <fieldset>
                    <legend className="field-label">Fitness goal</legend>
                    <div className="choice-grid three">
                      {goalOptions.map((option) => {
                        const Icon = option.icon;
                        return <Choice key={option.value} {...option} icon={<Icon size={19} />} selected={form.fitnessGoal === option.value} onClick={() => updateField("fitnessGoal", option.value)} />;
                      })}
                    </div>
                    <FieldError>{errors.fitnessGoal}</FieldError>
                  </fieldset>
                </div>
              )}

              {step === 2 && (
                <div className="animate-in space-y-7">
                  <fieldset>
                    <legend className="field-label">Diet type</legend>
                    <div className="pill-grid">
                      {dietOptions.map((diet) => (
                        <button type="button" key={diet} className={form.dietType === diet ? "pill selected" : "pill"} onClick={() => updateField("dietType", diet)} aria-pressed={form.dietType === diet}>{diet}</button>
                      ))}
                    </div>
                    <FieldError>{errors.dietType}</FieldError>
                  </fieldset>
                  <fieldset>
                    <legend className="field-label">Allergies</legend>
                    <p className="field-hint">Select all that apply. You can add your own.</p>
                    <div className="pill-grid mt-3">
                      {commonAllergies.map((allergy) => (
                        <button type="button" key={allergy} className={form.allergies.includes(allergy) ? "pill selected" : "pill"} onClick={() => toggleAllergy(allergy)} aria-pressed={form.allergies.includes(allergy)}>{allergy}</button>
                      ))}
                    </div>
                    <div className="custom-allergies">
                      {form.allergies.filter((allergy) => !commonAllergies.includes(allergy)).map((allergy) => (
                        <span key={allergy}>{allergy}<button type="button" onClick={() => toggleAllergy(allergy)} aria-label={`Remove ${allergy}`}><X size={13} /></button></span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input aria-label="Add another allergy" placeholder="Add another allergy" value={customAllergy} onChange={(event) => setCustomAllergy(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustomAllergy(event); }} />
                      <button type="button" onClick={addCustomAllergy} aria-label="Add allergy" title="Add allergy"><Plus size={20} /></button>
                    </div>
                  </fieldset>
                  <div>
                    <label className="field-label" htmlFor="excludedFoods">Foods to exclude</label>
                    <p className="field-hint">Ingredients you dislike or prefer not to eat.</p>
                    <textarea id="excludedFoods" rows={3} placeholder="e.g. mushrooms, olives, cilantro" value={form.excludedFoods} onChange={(event) => updateField("excludedFoods", event.target.value)} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-in space-y-7">
                  <fieldset>
                    <legend className="field-label">Cuisine preference</legend>
                    <div className="pill-grid">
                      {cuisineOptions.map((cuisine) => (
                        <button type="button" key={cuisine} className={form.cuisinePreference === cuisine ? "pill selected" : "pill"} onClick={() => updateField("cuisinePreference", cuisine)} aria-pressed={form.cuisinePreference === cuisine}>{cuisine}</button>
                      ))}
                    </div>
                    <FieldError>{errors.cuisinePreference}</FieldError>
                  </fieldset>
                  <fieldset>
                    <legend className="field-label">Cook time budget</legend>
                    <p className="field-hint">Your comfortable limit for an average meal.</p>
                    <div className="choice-grid two mt-3">
                      {cookTimeOptions.map((option) => (
                        <Choice key={option.value} {...option} icon={<Clock3 size={19} />} selected={form.cookTimeBudget === option.value} onClick={() => updateField("cookTimeBudget", option.value)} compact />
                      ))}
                    </div>
                    <FieldError>{errors.cookTimeBudget}</FieldError>
                  </fieldset>
                  <div className="privacy-note">
                    <Leaf size={18} />
                    <p>Your profile is saved in this browser and sent securely only when you request meal ideas.</p>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="button-secondary" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
                  <ArrowLeft size={18} /> Back
                </button>
                {step < steps.length - 1 ? (
                  <button type="button" className="button-primary" onClick={goNext}>Continue <ArrowRight size={18} /></button>
                ) : (
                  <button type="button" className="button-primary" onClick={finishOnboarding}>Save my profile <Check size={18} /></button>
                )}
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

function Completion({ profile, onReset }: { profile: SavedProfile; onReset: () => void }) {
  const goal = goalOptions.find((item) => item.value === profile.fitnessGoal)?.title ?? profile.fitnessGoal;
  const activity = activityOptions.find((item) => item.value === profile.activityLevel)?.title ?? profile.activityLevel;

  return (
    <div className="completion animate-in">
      <div className="success-mark"><Check size={29} strokeWidth={2.5} /></div>
      <p className="eyebrow">Profile saved locally</p>
      <h1>Your table is set.</h1>
      <p className="completion-intro">MealMind now has the context it needs to shape meals around your goals, preferences, and schedule.</p>
      <div className="summary-grid">
        <div className="summary-item"><HeartPulse size={20} /><span>Body</span><strong>BMI {profile.bmi}</strong><small>{profile.weight} kg · {profile.height} cm</small></div>
        <div className="summary-item"><Target size={20} /><span>Direction</span><strong>{goal}</strong><small>{activity}</small></div>
        <div className="summary-item"><UtensilsCrossed size={20} /><span>Table</span><strong>{profile.dietType}</strong><small>{profile.cuisinePreference}</small></div>
        <div className="summary-item"><Clock3 size={20} /><span>Kitchen</span><strong>{profile.cookTimeBudget} minutes</strong><small>Typical cook time</small></div>
      </div>
      {(profile.allergies.length > 0 || profile.excludedFoods) && (
        <div className="restriction-row">
          <span>Keep off the plate</span>
          <p>{[...profile.allergies, profile.excludedFoods].filter(Boolean).join(", ")}</p>
        </div>
      )}
      <div className="completion-actions">
        <Link href="/dashboard" className="button-primary">Back to dashboard <ArrowRight size={17} /></Link>
        <button type="button" className="button-secondary reset-button" onClick={onReset}><RotateCcw size={17} /> Edit my answers</button>
      </div>
    </div>
  );
}