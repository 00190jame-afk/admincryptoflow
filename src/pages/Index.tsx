import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-foreground">Crypto Flow Admin</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Administrative panel for managing users, trades, and platform operations
        </p>
        <Button asChild size="lg">
          <Link to="/auth">Access Admin Panel</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
