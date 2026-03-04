-- Add private trade support to trades table
ALTER TABLE public.trades ADD COLUMN is_private BOOLEAN DEFAULT false;
ALTER TABLE public.trades ADD COLUMN target_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- Update status check to include 'private'
ALTER TABLE public.trades DROP CONSTRAINT trades_status_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_status_check 
    CHECK (status IN ('active', 'traded', 'hidden', 'expired', 'draft', 'private'));

-- Update trade_offers to link to an actual trade post
ALTER TABLE public.trade_offers ADD COLUMN offered_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL;

-- Update RLS for trades to support private visibility
DROP POLICY IF EXISTS "Trades are viewable by everyone" ON public.trades;
CREATE POLICY "Trades are viewable by everyone" ON public.trades 
    FOR SELECT USING (
        status = 'active' OR 
        (SELECT public.clerk_user_id()) = owner_id OR 
        ((status = 'private' OR is_private = true) AND (SELECT public.clerk_user_id()) = target_user_id)
    );

-- Index for performance on target_user_id
CREATE INDEX idx_trades_target_user_id ON public.trades(target_user_id);
CREATE INDEX idx_trade_offers_offered_trade_id ON public.trade_offers(offered_trade_id);
