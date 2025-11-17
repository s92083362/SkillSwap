"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../shared/header/Header";
import SearchBar from "./ SearchBar";
import Categories from "./ Categories";
import SkillList from "./  SkillList";

// import ExchangeRequestModal from "./ExchangeRequestModal";

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const categories = [
    "Programming Languages",
    "Software Development",
    "IT Support",
    "Data Analysis",
    "Cybersecurity",
    "Cloud Computing"
  ];
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const skills = [
    {
      id: "python-for-beginners",
      title: "Python for Beginners",
      description: "Learn Python basics.",
      category: "Programming Languages"
    },
    {
      id: "js-essentials",
      title: "JavaScript Essentials",
      description: "Frontend essentials.",
      category: "Programming Languages"
    },
    {
      id: "react-advanced",
      title: "React Advanced",
      description: "Advanced React techniques.",
      category: "Software Development"
    }
    // Add more as needed
  ];

  const filteredSkills = skills.filter(skill =>
    (selectedCategory === null || skill.category === categories[selectedCategory]) &&
    (searchTerm === "" || skill.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Next.js App Router navigate
  const router = useRouter();
  const handleViewSkill = (skill) => {
    router.push(`/skills/${skill.id}`);
  };

  // The following modal state and logic is kept for reference;
  // you can activate ExchangeRequestModal from your skill detail page instead if desired.
  //
  // const [requestModalOpen, setRequestModalOpen] = useState(false);
  // const [selectedSkill, setSelectedSkill] = useState(null);
  // const [proposalMsg, setProposalMsg] = useState("");
  // const handleOpenModal = (skill) => {
  //   setSelectedSkill(skill);
  //   setRequestModalOpen(true);
  // };
  // const handleSubmitRequest = () => {
  //   setRequestModalOpen(false);
  //   setProposalMsg("");
  // };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className="mt-8 px-2 sm:px-4 lg:px-0">
        <SearchBar
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search skills..."
        />
      </div>
      <div className="mt-4 px-2 sm:px-4 lg:px-0">
        <Categories
          categories={categories}
          selectedIdx={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>
      <div className="mt-10 px-2 sm:px-4 lg:px-0">
        <SkillList skills={filteredSkills} onView={handleViewSkill} />
      </div>
      {/* Uncomment below if you want to re-enable the exchange request modal on dashboard */}
      {/*
      <ExchangeRequestModal
        open={requestModalOpen}
        skill={selectedSkill}
        proposalMsg={proposalMsg}
        setProposalMsg={setProposalMsg}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={handleSubmitRequest}
      />
      */}
    </div>
  );
}
