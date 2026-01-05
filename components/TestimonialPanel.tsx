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
        <div className="hidden md:flex flex-col justify-center items-center bg-gray-100 dark:bg-black border-l border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-12 lg:p-20">
            <div className="w-full max-w-sm">
                 <div key={currentIndex} className="animate-fade-in">
                    <p className="text-2xl lg:text-3xl font-display font-medium leading-relaxed tracking-tight">
                        "{currentTestimonial.quote}"
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                        <div className="h-10 w-1 bg-brand-primary rounded-full"></div>
                        <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                                {currentTestimonial.author}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {currentTestimonial.role}
                            </p>
                        </div>
                    </div>
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