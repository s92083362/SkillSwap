// "use client";
// import React from "react";

// interface ExchangeRequestModalProps {
//   open: boolean;
//   skill: { title: string } | null;
//   proposalMsg: string;
//   setProposalMsg: (val: string) => void;
//   onClose: () => void;
//   onSubmit: () => void;
// }

// const ExchangeRequestModal: React.FC<ExchangeRequestModalProps> = ({
//   open,
//   skill,
//   proposalMsg,
//   setProposalMsg,
//   onClose,
//   onSubmit,
// }) => {
//   if (!open || !skill) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
//       <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 sm:p-8">
//         <h3 className="font-bold text-xl mb-2">Skill Exchange Request</h3>
//         <p className="mb-3 text-gray-800">
//           <span className="font-semibold">{skill.title}</span>
//         </p>
//         <textarea
//           value={proposalMsg}
//           onChange={e => setProposalMsg(e.target.value)}
//           rows={4}
//           placeholder="Write your proposal message..."
//           className="w-full border border-gray-300 rounded-lg p-2 mb-4 resize-none focus:ring-2 focus:ring-blue-500"
//         />
//         <div className="flex justify-end gap-2">
//           <button
//             onClick={onClose}
//             className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
//             type="button"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={() => {
//               onSubmit();
//               setProposalMsg("");
//             }}
//             className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
//             type="button"
//           >
//             Submit Request
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ExchangeRequestModal;
