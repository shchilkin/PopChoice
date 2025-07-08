import React from "react";
import { QuestionCard } from "./QuestionCard";
import Button from "../Button/Button";

export const QuestionsForm = () => {
  return (
    <section className="flex flex-col items-center w-full gap-4">
      <section className="flex flex-col gap-2 w-full">
        <QuestionCard
          label="What’s your favorite movie and why?"
          placeholder="Share your thoughts on your favorite movie, including its plot, characters, and what makes it special to you."
        />
        <QuestionCard
          label="Are you in the mood for something new or a classic?"
          placeholder="Let us know if you prefer to watch a new release or revisit a classic film. Share your reasons!"
        />
        <QuestionCard
          label="Do you wanna have fun or do you want something serious?"
          placeholder="Share your thoughts on the tone you're looking for in a movie."
        />
      </section>
      <Button />
    </section>
  );
};
