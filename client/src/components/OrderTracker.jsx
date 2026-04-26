import { orderStatusLabels, orderStatusFlow } from '@/data/ordersData';
import { Check, Circle, Package, Truck, MapPin, CreditCard, Home, Star, MapPinOff } from 'lucide-react';

const statusIcons = {
  PENDING_ADDRESS:          <MapPinOff className="w-3.5 h-3.5" />,
  AWAITING_ADVANCE_PAYMENT: <CreditCard className="w-3.5 h-3.5" />,
  CONFIRMED:                <Check      className="w-3.5 h-3.5" />,
  FARMER_CONFIRMED:         <Check      className="w-3.5 h-3.5" />,
  READY_FOR_PICKUP:         <Package    className="w-3.5 h-3.5" />,
  OUT_FOR_DELIVERY:         <Truck      className="w-3.5 h-3.5" />,
  DELIVERED:                <MapPin     className="w-3.5 h-3.5" />,
  COMPLETED:                <Star       className="w-3.5 h-3.5" />,
};

const OrderTracker = ({ currentStatus }) => {
  const currentIdx = orderStatusFlow.indexOf(currentStatus);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start min-w-max">
        {orderStatusFlow.map((status, i) => {
          const isCompleted = i <= currentIdx;
          const isCurrent   = i === currentIdx;
          return (
            <div key={status} className="flex flex-col items-center" style={{ minWidth: 60 }}>
              <div className="flex items-center w-full">
                {/* Left connector */}
                {i > 0 && (
                  <div className={`flex-1 h-0.5 transition-colors duration-500 ${i <= currentIdx ? 'bg-primary' : 'bg-border'}`} />
                )}
                {/* Node */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCurrent   ? 'gradient-hero text-primary-foreground ring-4 ring-primary/20 scale-110' :
                  isCompleted ? 'bg-primary text-primary-foreground' :
                                'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted
                    ? (statusIcons[status] || <Check className="w-3.5 h-3.5" />)
                    : <Circle className="w-2.5 h-2.5" />}
                </div>
                {/* Right connector */}
                {i < orderStatusFlow.length - 1 && (
                  <div className={`flex-1 h-0.5 transition-colors duration-500 ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
              <span className={`text-[9px] mt-1 text-center leading-tight px-0.5 max-w-[56px] ${
                isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}>
                {orderStatusLabels[status] || status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTracker;
