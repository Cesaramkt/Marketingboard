import React from 'react';
import type { SavedProject } from '../types';

interface ProjectListProps {
  projects: SavedProject[];
  onLoadProject: (project: SavedProject) => void;
  onStartNew: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onLoadProject, onStartNew }) => {
  return (
    <div className="w-full max-w-4xl p-4 sm:p-6 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 font-['Playfair_Display',_serif]">
          Seus Projetos
        </h2>
        <button
          onClick={onStartNew}
          className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
        >
          Criar Novo Projeto
        </button>
      </div>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onLoadProject(project)}
            className="group flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-purple-500"
          >
            <div>
              <p className="font-semibold text-gray-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {project.company_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Criado em: {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-200 transition-transform transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};