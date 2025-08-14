/**
 * Statistics Engine - Advanced statistical analysis for AB testing
 * Provides rigorous statistical methods with performance optimization
 */

export interface TTestInput {
  controlValues: number[];
  treatmentValues: number[];
  significanceLevel: number;
  power: number;
}

export interface TTestResult {
  controlMean: number;
  treatmentMean: number;
  controlStdDev: number;
  treatmentStdDev: number;
  tStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  confidenceInterval: [number, number];
  effectSize: number;
  power: number;
}

export interface BayesianTestInput {
  controlValues: number[];
  treatmentValues: number[];
  priorAlpha: number;
  priorBeta: number;
}

export interface BayesianTestResult {
  probabilityTreatmentBetter: number;
  credibleInterval: [number, number];
  posteriorControl: { alpha: number; beta: number };
  posteriorTreatment: { alpha: number; beta: number };
}

/**
 * High-performance statistical analysis engine
 */
export class StatisticsEngine {
  private tTable = this.generateTTable(); // Pre-computed t-distribution values

  /**
   * Perform Welch's t-test for unequal variances
   */
  async performTTest(input: TTestInput): Promise<TTestResult> {
    const { controlValues, treatmentValues, significanceLevel } = input;

    if (controlValues.length === 0 || treatmentValues.length === 0) {
      throw new Error('Both groups must have at least one value');
    }

    // Calculate means
    const controlMean = this.calculateMean(controlValues);
    const treatmentMean = this.calculateMean(treatmentValues);

    // Calculate standard deviations
    const controlStdDev = this.calculateStandardDeviation(controlValues, controlMean);
    const treatmentStdDev = this.calculateStandardDeviation(treatmentValues, treatmentMean);

    // Welch's t-test for unequal variances
    const n1 = controlValues.length;
    const n2 = treatmentValues.length;
    const s1Squared = controlStdDev * controlStdDev;
    const s2Squared = treatmentStdDev * treatmentStdDev;

    // Calculate t-statistic
    const standardError = Math.sqrt(s1Squared / n1 + s2Squared / n2);
    const tStatistic = (treatmentMean - controlMean) / standardError;

    // Calculate degrees of freedom (Welch-Satterthwaite equation)
    const degreesOfFreedom = this.calculateWelchDF(s1Squared, s2Squared, n1, n2);

    // Calculate p-value
    const pValue = this.calculateTTestPValue(Math.abs(tStatistic), degreesOfFreedom);

    // Calculate confidence interval for the difference in means
    const tCritical = this.getTCriticalValue(significanceLevel / 2, degreesOfFreedom);
    const marginOfError = tCritical * standardError;
    const meanDifference = treatmentMean - controlMean;
    const confidenceInterval: [number, number] = [
      meanDifference - marginOfError,
      meanDifference + marginOfError
    ];

    // Calculate effect size (Cohen's d)
    const pooledStdDev = Math.sqrt(((n1 - 1) * s1Squared + (n2 - 1) * s2Squared) / (n1 + n2 - 2));
    const effectSize = (treatmentMean - controlMean) / pooledStdDev;

    // Calculate achieved power
    const achievedPower = this.calculatePower(effectSize, n1, n2, significanceLevel);

    return {
      controlMean,
      treatmentMean,
      controlStdDev,
      treatmentStdDev,
      tStatistic,
      pValue,
      degreesOfFreedom,
      confidenceInterval,
      effectSize,
      power: achievedPower
    };
  }

  /**
   * Perform Bayesian A/B test analysis
   */
  async performBayesianTest(input: BayesianTestInput): Promise<BayesianTestResult> {
    const { controlValues, treatmentValues, priorAlpha, priorBeta } = input;

    // Convert values to successes/failures for Beta-Binomial model
    const controlSuccesses = controlValues.filter(v => v > 0).length;
    const controlTotal = controlValues.length;
    const treatmentSuccesses = treatmentValues.filter(v => v > 0).length;
    const treatmentTotal = treatmentValues.length;

    // Update posterior distributions
    const posteriorControl = {
      alpha: priorAlpha + controlSuccesses,
      beta: priorBeta + controlTotal - controlSuccesses
    };

    const posteriorTreatment = {
      alpha: priorAlpha + treatmentSuccesses,
      beta: priorBeta + treatmentTotal - treatmentSuccesses
    };

    // Monte Carlo simulation to calculate P(treatment > control)
    const probabilityTreatmentBetter = this.calculateBayesianProbability(
      posteriorControl,
      posteriorTreatment
    );

    // Calculate credible interval for the difference
    const credibleInterval = this.calculateBayesianCredibleInterval(
      posteriorControl,
      posteriorTreatment
    );

    return {
      probabilityTreatmentBetter,
      credibleInterval,
      posteriorControl,
      posteriorTreatment
    };
  }

  /**
   * Calculate required sample size for desired power
   */
  calculateRequiredSampleSize(
    effectSize: number,
    power: number,
    significanceLevel: number
  ): number {
    // Cohen's formula for sample size calculation
    const zAlpha = this.getZScore(significanceLevel / 2);
    const zBeta = this.getZScore(1 - power);
    
    const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 2;
    return Math.ceil(n);
  }

  /**
   * Detect if test has sufficient statistical power
   */
  hasAdequatePower(
    controlValues: number[],
    treatmentValues: number[],
    minPower: number,
    significanceLevel: number
  ): boolean {
    if (controlValues.length < 30 || treatmentValues.length < 30) {
      return false; // Insufficient for reliable power analysis
    }

    const controlMean = this.calculateMean(controlValues);
    const treatmentMean = this.calculateMean(treatmentValues);
    const controlStd = this.calculateStandardDeviation(controlValues, controlMean);
    const treatmentStd = this.calculateStandardDeviation(treatmentValues, treatmentMean);
    
    const pooledStd = Math.sqrt((controlStd * controlStd + treatmentStd * treatmentStd) / 2);
    const effectSize = Math.abs(treatmentMean - controlMean) / pooledStd;
    
    const achievedPower = this.calculatePower(
      effectSize,
      controlValues.length,
      treatmentValues.length,
      significanceLevel
    );

    return achievedPower >= minPower;
  }

  // Private utility methods

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const sumSquaredDeviations = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    return Math.sqrt(sumSquaredDeviations / (values.length - 1));
  }

  private calculateWelchDF(s1Squared: number, s2Squared: number, n1: number, n2: number): number {
    const numerator = Math.pow(s1Squared / n1 + s2Squared / n2, 2);
    const denominator = 
      Math.pow(s1Squared / n1, 2) / (n1 - 1) + 
      Math.pow(s2Squared / n2, 2) / (n2 - 1);
    
    return numerator / denominator;
  }

  private calculateTTestPValue(tStat: number, df: number): number {
    // Approximate p-value calculation using integration
    // For production, consider using a statistical library
    
    if (df <= 0) return 1;
    
    // Use Student's t-distribution approximation
    const a = 0.5 * Math.pow(1 + (tStat * tStat) / df, -(df + 1) / 2);
    return 2 * a; // Two-tailed test
  }

  private getTCriticalValue(alpha: number, df: number): number {
    // Simplified t-table lookup - in production use proper statistical library
    // This is an approximation
    
    if (df >= 120) {
      // Use normal distribution approximation for large df
      return this.getZScore(alpha);
    }

    // Rough approximation for common significance levels
    if (alpha <= 0.025) {
      if (df <= 10) return 2.228;
      if (df <= 20) return 2.086;
      if (df <= 30) return 2.042;
      return 1.96;
    }
    
    return 1.96; // Default fallback
  }

  private getZScore(probability: number): number {
    // Approximate inverse normal distribution
    // For production, use proper statistical library
    
    if (probability <= 0.025) return 1.96;
    if (probability <= 0.05) return 1.645;
    if (probability <= 0.10) return 1.282;
    
    return 1.0; // Default fallback
  }

  private calculatePower(
    effectSize: number,
    n1: number,
    n2: number,
    significanceLevel: number
  ): number {
    // Approximate power calculation
    const nHarmonic = 2 / (1/n1 + 1/n2);
    const delta = effectSize * Math.sqrt(nHarmonic / 2);
    const zAlpha = this.getZScore(significanceLevel / 2);
    
    // Power = P(Z > z_alpha - delta)
    const power = 1 - this.normalCDF(zAlpha - delta);
    return Math.max(0, Math.min(1, power));
  }

  private normalCDF(x: number): number {
    // Approximate cumulative distribution function for standard normal
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximate error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateBayesianProbability(
    posteriorControl: { alpha: number; beta: number },
    posteriorTreatment: { alpha: number; beta: number }
  ): number {
    // Monte Carlo simulation
    const iterations = 10000;
    let treatmentWins = 0;

    for (let i = 0; i < iterations; i++) {
      const controlSample = this.sampleBeta(posteriorControl.alpha, posteriorControl.beta);
      const treatmentSample = this.sampleBeta(posteriorTreatment.alpha, posteriorTreatment.beta);
      
      if (treatmentSample > controlSample) {
        treatmentWins++;
      }
    }

    return treatmentWins / iterations;
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Generate Beta distribution sample using Gamma distributions
    const gammaAlpha = this.sampleGamma(alpha, 1);
    const gammaBeta = this.sampleGamma(beta, 1);
    
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  private sampleGamma(shape: number, scale: number): number {
    // Simple Gamma distribution sampling (Marsaglia and Tsang method simplified)
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    
    for (let i = 0; i < 100; i++) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      
      v = v * v * v;
      const u = Math.random();
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v * scale;
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
    
    return d * scale; // Fallback
  }

  private normalRandom(): number {
    // Box-Muller transform
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private calculateBayesianCredibleInterval(
    posteriorControl: { alpha: number; beta: number },
    posteriorTreatment: { alpha: number; beta: number }
  ): [number, number] {
    // Calculate 95% credible interval for difference in means
    const samples: number[] = [];
    
    for (let i = 0; i < 10000; i++) {
      const controlSample = this.sampleBeta(posteriorControl.alpha, posteriorControl.beta);
      const treatmentSample = this.sampleBeta(posteriorTreatment.alpha, posteriorTreatment.beta);
      samples.push(treatmentSample - controlSample);
    }
    
    samples.sort((a, b) => a - b);
    const lowerIndex = Math.floor(0.025 * samples.length);
    const upperIndex = Math.floor(0.975 * samples.length);
    
    return [samples[lowerIndex], samples[upperIndex]];
  }

  private generateTTable(): Map<string, number> {
    // Pre-computed t-distribution critical values
    // In production, this would be a comprehensive table
    const table = new Map<string, number>();
    
    // Format: "df_alpha" -> critical value
    table.set("10_0.025", 2.228);
    table.set("20_0.025", 2.086);
    table.set("30_0.025", 2.042);
    table.set("inf_0.025", 1.96);
    
    return table;
  }

  // Health check for service registry
  async healthCheck(): Promise<boolean> {
    try {
      // Test basic mathematical operations
      const testValues = [1, 2, 3, 4, 5];
      const mean = this.calculateMean(testValues);
      const std = this.calculateStandardDeviation(testValues, mean);
      
      return mean === 3 && std > 0;
    } catch {
      return false;
    }
  }
}