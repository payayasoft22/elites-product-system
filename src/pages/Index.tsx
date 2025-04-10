
import React from 'react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-brand-800 mb-4">Elites Program</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Elevate your business management with powerful tools and insights
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            to="/login" 
            className="bg-brand-600 text-white px-6 py-3 rounded-md hover:bg-brand-700 transition-colors"
          >
            Login
          </Link>
          <Link 
            to="/signup" 
            className="border border-brand-600 text-brand-600 px-6 py-3 rounded-md hover:bg-brand-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
