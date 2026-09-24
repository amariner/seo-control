import type { PortfolioComparison, PortfolioMarketRow } from "@seo/contracts";
import { CompareBars } from "../report/compare-bars";

/** Escala compartida por mercado, con los mismos datos de la tabla. */
export function MarketBars({
  markets,
  compare,
}: {
  markets: PortfolioMarketRow[];
  compare: PortfolioComparison;
}) {
  const previousYear = compare === "previousYear";
  return (
    <CompareBars
      categories={markets.map((market) => market.name)}
      series={[
        {
          key: "current",
          name: "Periodo actual",
          values: markets.map((market) => market.sessions),
        },
        {
          key: previousYear ? "previousYear" : "previous",
          name: previousYear ? "Interanual" : "Periodo anterior",
          values: markets.map((market) =>
            previousYear
              ? market.previousYearSessions
              : market.previousSessions,
          ),
        },
      ]}
      horizontal
      height={Math.max(240, markets.length * 56)}
      label="Sesiones orgánicas por mercado"
    />
  );
}
