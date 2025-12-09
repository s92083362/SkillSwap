// "use client";
// import React from "react";

// interface CategoriesProps {
//   categories: string[];
//   selectedCategory: string;
//   onSelect: (category: string) => void;
// }

// const Categories: React.FC<CategoriesProps> = ({
//   categories,
//   selectedCategory,
//   onSelect,
// }) => {
//   return (
//     <div className="mb-8 sm:mb-12">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
//         <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
//           {categories.map((category, idx) => (
//             <button
//               key={idx}
//               className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-200 border whitespace-nowrap shadow-sm hover:shadow-md
//                 ${
//                   category === selectedCategory
//                     ? "bg-blue-600 text-white border-blue-600 shadow-md"
//                     : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
//                 }
//               `}
//               onClick={() => onSelect(category)}
//             >
//               {category === "all" ? "All Skills" : category}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Categories;