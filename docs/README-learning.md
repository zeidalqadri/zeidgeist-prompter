# Prompt Enhancer Learning System

This document describes the learning capabilities that have been added to the prompt-enhancer system.

## Overview

The prompt-enhancer now includes a learning system that can:

1. **Learn from examples** - The system can learn from examples of raw prompts and their enhanced versions
2. **Adapt rule weights** - The system adjusts which enhancement rules to apply based on feedback
3. **Detect patterns** - The system learns common patterns and phrase replacements
4. **Apply domain-specific enhancements** - The system learns domain-specific terms and enhancements

## Learning Components

The learning system consists of several key components:

### 1. Pattern Learner (`src/learning/patternLearner.js`)

- Learns phrase replacements (e.g., "cum" → "who is also an")
- Detects and stores domain-specific terms
- Applies learned patterns to new prompts

### 2. Rule Weight Learner (`src/learning/ruleWeightLearner.js`) 

- Maintains weights for different enhancement rules
- Adjusts weights based on feedback (ratings from 1-5)
- Applies rules probabilistically based on their weights

### 3. Batch Trainer (`src/training/batchTrainer.js`)

- Processes training data from JSON files
- Extracts patterns and updates rule weights
- Supports different training data formats

## How to Use

### Training the System

There are several ways to train the system:

#### 1. Using the Training Script

```bash
node src/trainFromExamples.js
```

This script trains the system using the examples in `datasets/training_examples.json`.

#### 2. Using the API

```bash
curl -X POST http://localhost:3000/api/train -H "Content-Type: application/json" -d '{"filePath": "datasets/training_examples.json"}'
```

```bash
curl -X POST http://localhost:3000/api/train/example -H "Content-Type: application/json" -d '{"original": "website for dentist cum researcher", "enhanced": "website for dentist who is also a researcher", "rating": 5, "ruleTypes": ["professionalTitle", "cumReplacer"]}'
```

#### 3. Using the Feedback System

The system learns automatically from feedback through the `/api/feedback` endpoint.

### Testing the System

You can test the system using:

```bash
node src/test/quickTest.js
```

This runs the enhancer on a set of test prompts and shows the enhancements applied.

## Training Data Format

Training data can be provided in either of these formats:

### Simple Format

```json
[
  {
    "original": "website for orthodontist cum associate professor",
    "enhanced": "website for orthodontist who is also an associate professor",
    "rating": 5,
    "ruleTypes": ["professionalTitle", "cumReplacer"]
  }
]
```

### Schema-Based Format

```json
[
  {
    "id": "ex001",
    "raw_prompt": "website for orthodontist cum associate professor",
    "enhanced_prompt": "website for orthodontist who is also an associate professor",
    "domain": "healthcare",
    "enhancement_types": ["content.language.professional_title_handling"],
    "metadata": {
      "effectiveness_rating": 4.5
    }
  }
]
```

## Learning Outcomes

After training, the system will have learned:

1. **Phrase replacements** - Common phrases that should be replaced
2. **Domain-specific terms** - Terms commonly associated with different domains
3. **Rule importance** - Which rules are most effective for different types of prompts

## Future Improvements

Potential improvements to the learning system:

1. **Vector embeddings** - Use semantic similarity to detect similar prompts
2. **Integration with ML models** - Connect to external ML services for more sophisticated learning
3. **User profiles** - Learn user-specific preferences
4. **A/B testing framework** - Systematically test different enhancement strategies 