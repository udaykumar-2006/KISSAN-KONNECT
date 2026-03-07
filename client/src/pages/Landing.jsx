import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(61,107,61,0.25)_0%,transparent_70%),radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(196,113,74,0.12)_0%,transparent_60%),var(--color-soil)]" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="floater w-[400px] h-[400px] bg-sage top-[-100px] right-[-100px]" />
        <div className="floater w-[300px] h-[300px] bg-wheat bottom-[-50px] left-[-80px]" />
        <div className="floater w-[200px] h-[200px] bg-clay top-[40%] right-[15%]" />
      </div>

      <Navbar />

      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-8 relative z-10 fade-up">
        <div className="text-sage text-xs tracking-widest uppercase mb-6">🌱 Farm-to-Market, Reimagined</div>
        <h1 className="font-syne font-extrabold text-cream text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] mb-6">
          Where <span className="text-wheat relative inline-block after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-sage after:rounded-full">Farmers</span><br />Meet Buyers
        </h1>
        <p className="max-w-lg text-cream/60 leading-relaxed mb-12 text-base">
          Direct connections between Indian farmers and bulk buyers. Negotiate fair prices, eliminate middlemen, build lasting trade relationships.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Button variant="primary" size="lg">Join as Farmer →</Button>
          <Button variant="secondary" size="lg">I'm a Buyer →</Button>
        </div>
      </div>

      <div className="grain" />
    </div>
  );
}