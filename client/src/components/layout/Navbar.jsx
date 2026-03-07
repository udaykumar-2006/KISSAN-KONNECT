import { Link } from 'react-router-dom';
import Button from '../ui/Button';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-16 py-6 relative z-10">
      <div className="font-syne font-extrabold text-wheat text-xl">
        Kisaan<span className="text-sage">Konnect</span>
      </div>
      <div className="flex items-center gap-8">
        <span className="text-cream/60 text-sm cursor-pointer hover:text-wheat">How it works</span>
        <span className="text-cream/60 text-sm cursor-pointer hover:text-wheat">For Farmers</span>
        <span className="text-cream/60 text-sm cursor-pointer hover:text-wheat">For Buyers</span>
        <Button variant="outline" as={Link} to="/signin">Sign In</Button>
        <Button variant="primary" as={Link} to="/signup">Get Started</Button>
      </div>
    </nav>
  );
}