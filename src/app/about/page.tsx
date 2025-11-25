"use client"

import TeamCarousel from "@/components/about/TeamCarousel";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <section className="max-w-3xl mx-auto mb-16 text-center">
          <h1 className="text-5xl font-bold text-blue-900 mb-6">About SkillSwap</h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            <span className="font-semibold text-blue-800">SkillSwap</span> is a next-generation peer-to-peer skill exchange platform.
            We empower users to learn and teach directly within a vibrant tech community, 
            with seamless chat, secure authentication, and responsive dashboards.
          </p>
          <p className="text-gray-600">
            Join thousands of learners and experts sharing knowledge, building connections, 
            and growing together in a collaborative environment.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl text-blue-900 font-bold mb-12 text-center">Meet Our Team</h2>
          <div className="flex justify-center">
            <TeamCarousel />
          </div>
        </section>

        <section className="max-w-4xl mx-auto mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
            <div className="text-4xl font-bold text-blue-900 mb-2">1000+</div>
            <div className="text-gray-600 font-medium">Active Users</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
            <div className="text-4xl font-bold text-blue-900 mb-2">50+</div>
            <div className="text-gray-600 font-medium">Skills Shared</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
            <div className="text-4xl font-bold text-blue-900 mb-2">500+</div>
            <div className="text-gray-600 font-medium">Successful Exchanges</div>
          </div>
        </section>
      </div>
    </main>
  );
}