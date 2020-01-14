
import React from 'react';

import Card from './Card';

const CardExchanges = () => (
  //@todo move this to config to avoid conflicts
  <Card title="Exchanges">
    <a href="https://graviex.net/markets/norbtc" target="_blank" rel="nofollow noopener">Graviex</a><br />
    <a href="https://blocknet.co/block-dx/" target="_blank" rel="nofollow noopener">BlockDX</a><br />
    <a href="https://bisq.network/markets/?currency=nor_btc" target="_blank" rel="nofollow noopener">Bisq</a><br />
    <a href="https://www.altilly.com/market/NOR_BTC" target="_blank" rel="nofollow noopener">Altilly</a><br />
    <a href="https://www.finexbox.com/market/pair/NOR-BTC.html" target="_blank" rel="nofollow noopener">Finexbox</a><br />
  </Card>
);

export default CardExchanges;
