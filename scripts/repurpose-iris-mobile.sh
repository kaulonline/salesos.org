#!/bin/bash

################################################################################
# SalesOS Mobile - Repurpose IRIS Mobile Script
# This script automates the initial setup for repurposing IRIS mobile app
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
IRIS_MOBILE_DIR="/opt/IRIS_Sales_GPT/iris_mobile"
SALESOS_MOBILE_DIR="/opt/salesos.org/salesos_mobile"
BACKUP_DIR="/opt/salesos.org/backups/iris_mobile_$(date +%Y%m%d_%H%M%S)"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if IRIS mobile exists
    if [ ! -d "$IRIS_MOBILE_DIR" ]; then
        print_error "IRIS mobile directory not found at $IRIS_MOBILE_DIR"
        exit 1
    fi
    print_success "IRIS mobile found"

    # Check if Flutter is installed
    if ! command -v flutter &> /dev/null; then
        print_error "Flutter is not installed. Please install Flutter first."
        echo "Visit: https://docs.flutter.dev/get-started/install"
        exit 1
    fi
    print_success "Flutter installed: $(flutter --version | head -1)"

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git installed"

    echo ""
}

# Copy IRIS mobile to SalesOS directory
copy_iris_mobile() {
    print_header "Step 1: Copying IRIS Mobile Codebase"

    # Create backup first
    print_info "Creating backup at $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$IRIS_MOBILE_DIR" "$BACKUP_DIR/"
    print_success "Backup created"

    # Check if target directory exists
    if [ -d "$SALESOS_MOBILE_DIR" ]; then
        print_warning "Target directory already exists: $SALESOS_MOBILE_DIR"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Operation cancelled"
            exit 1
        fi
        rm -rf "$SALESOS_MOBILE_DIR"
    fi

    # Copy IRIS mobile
    print_info "Copying codebase..."
    cp -r "$IRIS_MOBILE_DIR" "$SALESOS_MOBILE_DIR"
    print_success "Codebase copied to $SALESOS_MOBILE_DIR"

    echo ""
}

# Update basic configuration
update_basic_config() {
    print_header "Step 2: Updating Basic Configuration"

    cd "$SALESOS_MOBILE_DIR"

    # Update pubspec.yaml
    print_info "Updating pubspec.yaml..."
    sed -i.bak 's/name: iris_mobile/name: salesos_mobile/' pubspec.yaml
    sed -i.bak 's/description: .*/description: AI-Powered Sales CRM for iOS \& Android/' pubspec.yaml
    print_success "pubspec.yaml updated"

    # Update AppConfig
    print_info "Updating app configuration..."
    if [ -f "lib/core/config/app_config.dart" ]; then
        sed -i.bak "s/appName = 'IRIS'/appName = 'SalesOS'/" lib/core/config/app_config.dart
        sed -i.bak "s/engage\.iriseller\.com/salesos.org/" lib/core/config/app_config.dart
        sed -i.bak "s/iriseller\.com/salesos.org/g" lib/core/config/app_config.dart
        print_success "AppConfig updated"
    else
        print_warning "AppConfig not found, skipping..."
    fi

    # Clean build artifacts
    print_info "Cleaning build artifacts..."
    flutter clean > /dev/null 2>&1 || true
    rm -rf .dart_tool build
    print_success "Build artifacts cleaned"

    echo ""
}

# Update theme colors
update_theme() {
    print_header "Step 3: Updating Theme Colors (Preview)"

    cd "$SALESOS_MOBILE_DIR"

    print_info "Creating theme backup..."
    if [ -f "lib/core/config/theme.dart" ]; then
        cp lib/core/config/theme.dart lib/core/config/theme.dart.iris.bak
        print_success "Theme backup created"

        print_warning "Manual theme update required:"
        echo "  - Replace irisGold (#D99C79) → #EAD07D"
        echo "  - Replace irisBlack (#0D0D0D) → #1A1A1A"
        echo "  - Add salesOSBg (#F2F1EA)"
        echo ""
        echo "  Theme file: lib/core/config/theme.dart"
    else
        print_warning "Theme file not found"
    fi

    echo ""
}

# Initialize git repository
init_git() {
    print_header "Step 4: Initializing Git Repository"

    cd "$SALESOS_MOBILE_DIR"

    # Remove existing git
    rm -rf .git

    # Initialize new git repo
    git init
    print_success "Git repository initialized"

    # Create .gitignore if not exists
    if [ ! -f ".gitignore" ]; then
        print_info "Creating .gitignore..."
        cat > .gitignore << 'EOF'
# Flutter
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
build/
flutter_*.png
linked_*.ds
unlinked.ds
unlinked_spec.ds

# iOS
*.mode1v3
*.mode2v3
*.moved-aside
*.pbxuser
*.perspectivev3
**/*sync/
.sconsign.dblite
.tags*
**/.vagrant/
**/DerivedData/
Icon?
**/Pods/
**/.symlinks/
profile
xcuserdata
**/.generated/
Flutter/App.framework
Flutter/Flutter.framework
Flutter/Flutter.podspec
Flutter/Generated.xcconfig
**/Flutter/ephemeral/
**/Podfile.lock

# Android
**/android/**/gradle-wrapper.jar
**/android/.gradle
**/android/captures/
**/android/gradlew
**/android/gradlew.bat
**/android/local.properties
**/android/**/GeneratedPluginRegistrant.java
**/android/key.properties
*.jks

# IntelliJ
*.iml
*.ipr
*.iws
.idea/

# VS Code
.vscode/

# Backup files
*.bak
*.backup
EOF
        print_success ".gitignore created"
    fi

    # Initial commit
    git add .
    git commit -m "Initial commit: Repurposed from IRIS mobile

- Copied IRIS mobile codebase
- Updated app name to SalesOS
- Updated package name
- Cleaned build artifacts

Base version: IRIS mobile $(date +%Y-%m-%d)"

    print_success "Initial commit created"

    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Step 5: Installing Dependencies"

    cd "$SALESOS_MOBILE_DIR"

    print_info "Running flutter pub get..."
    flutter pub get

    print_success "Dependencies installed"

    echo ""
}

# Generate API compatibility report
generate_api_report() {
    print_header "Step 6: Generating API Compatibility Report"

    cd "$SALESOS_MOBILE_DIR"

    print_info "Analyzing API endpoints..."

    # Create report directory
    mkdir -p docs/api-compatibility

    # Extract API endpoints from codebase
    cat > docs/api-compatibility/endpoints.md << 'EOF'
# API Compatibility Report

## IRIS Endpoints Found

Below are the API endpoints found in the IRIS mobile codebase.
These need to be verified against SalesOS API.

### Authentication
- POST /auth/login
- POST /auth/register
- GET /auth/me
- POST /auth/logout
- POST /auth/refresh
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/change-password

### Leads
- GET /leads
- POST /leads
- GET /leads/:id
- PUT /leads/:id
- DELETE /leads/:id
- POST /leads/score
- POST /leads/convert

### Deals/Opportunities
- GET /deals (or /opportunities in SalesOS?)
- POST /deals
- GET /deals/:id
- PUT /deals/:id
- DELETE /deals/:id

### Contacts
- GET /contacts
- POST /contacts
- GET /contacts/:id
- PUT /contacts/:id
- DELETE /contacts/:id

### Accounts
- GET /accounts
- POST /accounts
- GET /accounts/:id
- PUT /accounts/:id
- DELETE /accounts/:id

### Dashboard
- GET /dashboard/stats
- GET /dashboard/metrics

## Testing Checklist

- [ ] Verify authentication endpoints
- [ ] Test CRUD operations for each entity
- [ ] Check pagination format
- [ ] Verify error response format
- [ ] Test token refresh mechanism
- [ ] Validate data model schemas

## Notes

Add your findings here as you test each endpoint.
EOF

    print_success "API compatibility report template created"
    print_info "Report location: docs/api-compatibility/endpoints.md"

    echo ""
}

# Print next steps
print_next_steps() {
    print_header "✅ Setup Complete!"

    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Review the codebase:"
    echo "   ${BLUE}cd $SALESOS_MOBILE_DIR${NC}"
    echo ""
    echo "2. Read the repurposing plan:"
    echo "   ${BLUE}cat /opt/salesos.org/docs/mobile-app-repurposing-plan.md${NC}"
    echo ""
    echo "3. Update theme colors:"
    echo "   ${BLUE}vim lib/core/config/theme.dart${NC}"
    echo "   Replace IRIS colors with SalesOS colors"
    echo ""
    echo "4. Configure API endpoint:"
    echo "   ${BLUE}vim lib/core/config/app_config.dart${NC}"
    echo "   Set baseUrl to your SalesOS API"
    echo ""
    echo "5. Test API compatibility:"
    echo "   ${BLUE}vim docs/api-compatibility/endpoints.md${NC}"
    echo "   Test each endpoint against SalesOS API"
    echo ""
    echo "6. Run the app:"
    echo "   ${BLUE}flutter run${NC}"
    echo ""
    echo "📚 Documentation:"
    echo "   - Full Proposal: /opt/salesos.org/docs/mobile-app-proposal.md"
    echo "   - Quick Start: /opt/salesos.org/docs/mobile-app-quick-start.md"
    echo "   - Repurposing Plan: /opt/salesos.org/docs/mobile-app-repurposing-plan.md"
    echo ""
    echo "🎯 Estimated Timeline: 2-3 months"
    echo "💰 Estimated Cost: \$40K-\$60K"
    echo ""
    print_success "Ready to build SalesOS Mobile! 🚀"
    echo ""
}

################################################################################
# Main execution
################################################################################

main() {
    clear
    print_header "SalesOS Mobile - Repurpose IRIS Mobile"
    echo ""
    echo "This script will:"
    echo "  1. Copy IRIS mobile codebase"
    echo "  2. Update basic configuration"
    echo "  3. Initialize git repository"
    echo "  4. Install dependencies"
    echo "  5. Generate API compatibility report"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operation cancelled"
        exit 1
    fi
    echo ""

    check_prerequisites
    copy_iris_mobile
    update_basic_config
    update_theme
    init_git
    install_dependencies
    generate_api_report
    print_next_steps
}

# Run main function
main "$@"
