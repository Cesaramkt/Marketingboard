import React, { useState, useEffect } from 'react';

const testimonials = [
  {
    quote: "O Marketingboard alinhou todo o nosso departamento de marketing em uma tarde. O que levava semanas, agora é instantâneo.",
    author: "Juliana S.",
    role: "Diretora de Marketing, TechFin",
  },
  {
    quote: "Contratei uma agência e enviei o Marketingboard. Eles me disseram que foi o melhor briefing que já receberam. Zero alterações.",
    author: "Marcos T.",
    role: "Fundador, Café Especiale",
  },
  {
    quote: "Finalmente temos um documento único que guia nosso design, nossa escrita e nossa estratégia. É a nossa 'Bíblia da Marca'.",
    author: "Carla P.",
    role: "CEO, VesteBem E-commerce",
  },
  {
    quote: "Passei o material para um freelancer e o resultado foi perfeito na primeira entrega. Economizei tempo e dinheiro.",
    author: "Rafael L.",
    role: "Empreendedor Individual",
  }
];

export const TestimonialPanel: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % testimonials.length);
        }, 7000); // Change testimonial every 7 seconds
        return () => clearInterval(interval);
    }, []);

    const currentTestimonial = testimonials[currentIndex];

    return (
        <div className="hidden md:flex flex-col justify-center items-center bg-gray-900 dark:bg-black text-white p-12 lg:p-20">
            <div className="w-full max-w-sm">
                 <div key={currentIndex} className="animate-fade-in">
                    <p className="text-2xl lg:text-3xl font-['Playfair_Display',_serif] italic text-slate-100">
                        "{currentTestimonial.quote}"
                    </p>
                    <p className="mt-6 font-semibold text-purple-300">
                        {currentTestimonial.author}
                    </p>
                    <p className="text-sm text-slate-400">
                        {currentTestimonial.role}
                    </p>
                </div>
            </div>
             <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
