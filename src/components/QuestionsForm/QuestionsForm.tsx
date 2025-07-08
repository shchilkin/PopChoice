"use client";
import React, { useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { Button } from "../Button/Button";
import "./form.css";

export interface FormData {
  name: string;
  email: string;
  moviePreference: string;
}

export const QuestionsForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    moviePreference: ''
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFormValid = formData.name.trim() !== '' && 
                     formData.email.trim() !== '' && 
                     formData.moviePreference.trim() !== '';

  const handleSubmit = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (isFormValid) {
      // Show alert with form data as requested in the issue
      alert(`Form submitted with data:
Name: ${formData.name}
Email: ${formData.email}
Movie Preference: ${formData.moviePreference}`);
    }
  };

  return (
    <form className="questions-form" onSubmit={handleSubmit}>
      <section className="flex flex-col items-center w-full gap-4">
        <section className="flex flex-col gap-2 w-full">
          <div className="form-group">
            <label htmlFor="name" className="text-md font-regular text-start w-full dark:text-gray-300">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="text-md font-regular text-start w-full dark:text-gray-300">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <QuestionCard
            label="What kind of movie are you in the mood for? *"
            placeholder="Tell us about your movie preferences, what genres you like, or what you're in the mood for today..."
            value={formData.moviePreference}
            onChange={(value) => handleInputChange('moviePreference', value)}
            name="moviePreference"
          />
        </section>
        <Button
          disabled={!isFormValid}
          onClick={handleSubmit}
        >Find Me a Movie</Button>
      </section>
    </form>
  );
};
