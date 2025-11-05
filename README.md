# SkillSwap

> A peer-to-peer skill exchange platform that breaks down monetary barriers to learning

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)


## 📖 About The Project

SkillSwap is a collaborative web application developed by a team of software engineering students. It aims to simplify peer-to-peer knowledge sharing by allowing users to exchange skills directly without financial transactions. The platform connects learners and teachers within the community—developers, designers, or creators—enabling them to both teach what they know and learn what they want in an interactive, skill-focused environment.

###   Key Features

- **👤 User Profiles**: Showcase your expertise and skills you're willing to teach
- **📚 Structured Lesson Series**: Create and organize comprehensive learning paths
- **🎥 Introductory Videos**: Give learners a preview of your teaching style
- **🔄 Dual Role System**: Be both a learner and a skill provider simultaneously
- **💬 Direct Communication**: Connect with other users to exchange knowledge
- **🎯 Skill Matching**: Find the perfect learning partner based on complementary skills

## 🛠️ Built With

### Frontend
- **[Next.js](https://nextjs.org/)** - React framework for production-grade applications
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework for rapid UI development
- **React** - Component-based UI library

### Backend
- **[Firebase](https://firebase.google.com/)** – Authentication, Firestore database, Storage, Realtime Database for chat
- **[Node.js](https://nodejs.org/)** - JavaScript runtime for server-side development
- **Express.js** - Web application framework (assumed)

##  Getting Started

### Prerequisites

Make sure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skillswap.git
   cd skillswap
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   DATABASE_URL=your_database_url
   NEXTAUTH_SECRET=your_secret_key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📂 Project Structure

```
SKILLSWAP/
├── .next/                 # Next.js build output
├── .vscode/               # VS Code configuration
├── node_modules/          # Dependencies
├── public/                # Static assets
│   └── assets/
│       └── images/        # Image files
├── src/
│   └── app/               # Next.js app directory
│       ├── auth/          # Authentication pages
│       │   ├── forgot-password/
│       │   └── login-and-signup/
│       └── components/    # React components
│           └── auth/      # Auth-related components
├── .gitignore
├── eslint.config.mjs      # ESLint configuration
├── next.config.ts         # Next.js configuration
├── next-env.d.ts          # Next.js TypeScript declarations
├── package.json           # Project dependencies
├── package-lock.json      # Dependency lock file
├── postcss.config.mjs     # PostCSS configuration
├── README.md              # Project documentation
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Usage

### For Skill Providers
1. Create your profile highlighting your expertise
2. Set up lesson series with structured content
3. Upload introductory videos to attract learners
4. Connect with interested learners

### For Learners
1. Browse available skills and Skill Provider.
2. Watch introductory videos
3. Request skill exchanges
4. Start learning!

## 🤝 Contributing

Contributions from all team members are what make this project strong and collaborative! 
Team Collaboration Workflow,

1. Accept the repository invitation you receive from the team owner/maintainer.

2. Clone the repository to your local machine
 ```bash
git clone https://github.com/s92083362/SkillSwap.git
cd skillswap
 ```
3. Create a new feature branch from dev
 ```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
 ```
4. Commit your changes with clear, descriptive commit messages:
 ```bash
git commit -m "Add feature: your description"
 ```
5. Push your branch to the remote repository
 ```bash
git push origin feature/your-feature-name
 ```
6. Open a Pull Request to merge your feature branch into dev.

7. Wait for leader approval before merging.


## 👥 Team

This project was developed as a collaborative group effort. We're a team of passionate developers committed to making education accessible to everyone.

| Member | Student ID | Role |
|--------|------------|------|
| **R.M.B.P.B. Weerakoon** | S92083362 | Frontend and Backend Development |
| **R.M.Y.C.K. Rathnayake** | S92084087 | UI and UX Design |
| **D.M.S. Eswarage** | S92084130 | Backend Development |
| **P.V.V.R. Paranavitharana** | S92078248 | Frontend Development |
| **W.K. Amila Sandaruwan** | S92061304 | QA and Testing |



## 📧 Contact

Project Link: [https://github.com/s92083362/SkillSwap.git]


