
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-sidebar">
      <div className="text-center">
        {/* Use logo amarelo em fundo escuro */}
        <img 
          src="/lovable-uploads/9dbe1620-8f79-4cd0-9b06-d66c24802e9e.png" 
          alt="Metadesk" 
          className="h-24 mx-auto mb-4" 
        />
        <div className="animate-pulse">Carregando...</div>
      </div>
    </div>
  );
};

export default Index;
