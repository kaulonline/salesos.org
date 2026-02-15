import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Luxury text field variants - Premium SalesOS design
enum LuxuryTextFieldVariant {
  standard, // Default elegant style
  elevated, // With subtle shadow
  bordered, // Thin elegant border
  underlined, // Minimal underline style
}

/// Styled text field component with IRIS luxury design
/// Inspired by premium brand aesthetics: clean, elegant, refined
class IrisTextField extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? errorText;
  final String? helperText;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final bool readOnly;
  final bool enabled;
  final bool autofocus;
  final int? maxLines;
  final int? minLines;
  final int? maxLength;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final Widget? prefix;
  final Widget? suffix;
  final VoidCallback? onSuffixTap;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onTap;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final LuxuryTextFieldVariant variant;
  final LuxuryTier tier;

  const IrisTextField({
    super.key,
    this.label,
    this.hint,
    this.errorText,
    this.helperText,
    this.controller,
    this.focusNode,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.readOnly = false,
    this.enabled = true,
    this.autofocus = false,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.prefixIcon,
    this.suffixIcon,
    this.prefix,
    this.suffix,
    this.onSuffixTap,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.inputFormatters,
    this.validator,
    this.variant = LuxuryTextFieldVariant.bordered,
    this.tier = LuxuryTier.gold,
  });

  @override
  State<IrisTextField> createState() => _IrisTextFieldState();
}

class _IrisTextFieldState extends State<IrisTextField>
    with SingleTickerProviderStateMixin {
  bool _obscureText = false;
  late FocusNode _focusNode;
  bool _isFocused = false;
  late AnimationController _animationController;
  late Animation<double> _borderAnimation;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.obscureText;
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _borderAnimation = Tween<double>(begin: 1.0, end: 1.5).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    if (widget.focusNode == null) {
      _focusNode.dispose();
    } else {
      _focusNode.removeListener(_handleFocusChange);
    }
    super.dispose();
  }

  void _handleFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
    if (_isFocused) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  Color _getAccentColor() {
    switch (widget.tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: hasError
                  ? LuxuryColors.errorRuby
                  : (_isFocused
                      ? accentColor
                      : (isDark
                          ? LuxuryColors.textPlatinum
                          : LuxuryColors.textMuted)),
              fontWeight: FontWeight.w500,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
        ],
        AnimatedBuilder(
          animation: _borderAnimation,
          builder: (context, child) {
            return Container(
              decoration: _getContainerDecoration(isDark, hasError, accentColor),
              child: child,
            );
          },
          child: TextFormField(
            controller: widget.controller,
            focusNode: _focusNode,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            obscureText: _obscureText,
            readOnly: widget.readOnly,
            enabled: widget.enabled,
            autofocus: widget.autofocus,
            maxLines: widget.obscureText ? 1 : widget.maxLines,
            minLines: widget.minLines,
            maxLength: widget.maxLength,
            inputFormatters: widget.inputFormatters,
            validator: widget.validator,
            onChanged: widget.onChanged,
            onFieldSubmitted: widget.onSubmitted,
            onTap: widget.onTap,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              letterSpacing: 0.3,
            ),
            cursorColor: accentColor,
            cursorWidth: 1.5,
            decoration: _getInputDecoration(isDark, hasError, accentColor),
          ),
        ),
        if (hasError || widget.helperText != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              if (hasError)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Icon(
                    Icons.error_outline,
                    size: 14,
                    color: LuxuryColors.errorRuby,
                  ),
                ),
              Expanded(
                child: Text(
                  hasError ? widget.errorText! : widget.helperText!,
                  style: IrisTheme.labelSmall.copyWith(
                    color: hasError
                        ? LuxuryColors.errorRuby
                        : (isDark
                            ? LuxuryColors.textMuted
                            : LuxuryColors.textMuted),
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  BoxDecoration? _getContainerDecoration(
      bool isDark, bool hasError, Color accentColor) {
    switch (widget.variant) {
      case LuxuryTextFieldVariant.elevated:
        return BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: (hasError ? LuxuryColors.errorRuby : accentColor)
                  .withValues(alpha: _isFocused ? 0.15 : 0.05),
              blurRadius: _isFocused ? 12 : 6,
              offset: const Offset(0, 3),
            ),
          ],
        );
      case LuxuryTextFieldVariant.underlined:
        return null; // Handled by InputDecoration
      default:
        return null;
    }
  }

  InputDecoration _getInputDecoration(
      bool isDark, bool hasError, Color accentColor) {
    final borderColor = hasError
        ? LuxuryColors.errorRuby
        : (isDark
            ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
            : LuxuryColors.champagneGold.withValues(alpha: 0.15));

    final focusedBorderColor = hasError ? LuxuryColors.errorRuby : accentColor;

    final fillColor = isDark ? LuxuryColors.obsidian : Colors.white;

    InputBorder border;
    InputBorder focusedBorder;
    InputBorder enabledBorder;
    InputBorder disabledBorder;

    switch (widget.variant) {
      case LuxuryTextFieldVariant.underlined:
        border = UnderlineInputBorder(
          borderSide: BorderSide(color: borderColor, width: 1),
        );
        focusedBorder = UnderlineInputBorder(
          borderSide: BorderSide(
              color: focusedBorderColor, width: _borderAnimation.value),
        );
        enabledBorder = UnderlineInputBorder(
          borderSide: BorderSide(color: borderColor, width: 1),
        );
        disabledBorder = UnderlineInputBorder(
          borderSide: BorderSide(color: borderColor.withValues(alpha: 0.3), width: 1),
        );
        break;
      default:
        border = OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor, width: 1),
        );
        focusedBorder = OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
              color: focusedBorderColor, width: _borderAnimation.value),
        );
        enabledBorder = OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor, width: 1),
        );
        disabledBorder = OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor.withValues(alpha: 0.3), width: 1),
        );
    }

    return InputDecoration(
      hintText: widget.hint,
      hintStyle: IrisTheme.bodyMedium.copyWith(
        color: isDark ? LuxuryColors.textMuted : LuxuryColors.textMuted,
        letterSpacing: 0.3,
      ),
      errorText: null, // We handle error display manually
      filled: widget.variant != LuxuryTextFieldVariant.underlined,
      fillColor: fillColor,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 16,
      ),
      prefixIcon: widget.prefixIcon != null
          ? Padding(
              padding: const EdgeInsets.only(left: 16, right: 12),
              child: Icon(
                widget.prefixIcon,
                size: 20,
                color: _isFocused
                    ? accentColor
                    : (isDark
                        ? LuxuryColors.textMuted
                        : LuxuryColors.textMuted),
              ),
            )
          : widget.prefix,
      prefixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      suffixIcon: _buildSuffix(isDark, accentColor),
      suffixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      border: border,
      enabledBorder: enabledBorder,
      focusedBorder: focusedBorder,
      disabledBorder: disabledBorder,
    );
  }

  Widget? _buildSuffix(bool isDark, Color accentColor) {
    if (widget.obscureText) {
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: IconButton(
          icon: Icon(
            _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
            size: 20,
            color: _isFocused
                ? accentColor
                : (isDark ? LuxuryColors.textMuted : LuxuryColors.textMuted),
          ),
          onPressed: () {
            HapticFeedback.lightImpact();
            setState(() {
              _obscureText = !_obscureText;
            });
          },
        ),
      );
    }

    if (widget.suffixIcon != null) {
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: IconButton(
          icon: Icon(
            widget.suffixIcon,
            size: 20,
            color: _isFocused
                ? accentColor
                : (isDark ? LuxuryColors.textMuted : LuxuryColors.textMuted),
          ),
          onPressed: widget.onSuffixTap,
        ),
      );
    }

    return widget.suffix;
  }
}

/// Luxury search text field variant - Premium design
class IrisSearchField extends StatefulWidget {
  final TextEditingController? controller;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;
  final LuxuryTier tier;

  const IrisSearchField({
    super.key,
    this.controller,
    this.hint = 'Search...',
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.tier = LuxuryTier.gold,
  });

  @override
  State<IrisSearchField> createState() => _IrisSearchFieldState();
}

class _IrisSearchFieldState extends State<IrisSearchField> {
  bool _isFocused = false;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() {
        _isFocused = _focusNode.hasFocus;
      });
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  Color _getAccentColor() {
    switch (widget.tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: _isFocused
              ? accentColor
              : (isDark
                  ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                  : LuxuryColors.champagneGold.withValues(alpha: 0.1)),
          width: _isFocused ? 1.5 : 1,
        ),
        boxShadow: _isFocused
            ? [
                BoxShadow(
                  color: accentColor.withValues(alpha: 0.1),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: _focusNode,
        onChanged: (value) {
          widget.onChanged?.call(value);
          setState(() {}); // Rebuild to show/hide clear button
        },
        onSubmitted: widget.onSubmitted,
        style: IrisTheme.bodyMedium.copyWith(
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          letterSpacing: 0.3,
        ),
        cursorColor: accentColor,
        cursorWidth: 1.5,
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted,
            letterSpacing: 0.3,
          ),
          filled: true,
          fillColor: isDark ? LuxuryColors.obsidian : Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 16, right: 12),
            child: Icon(
              Icons.search,
              size: 20,
              color: _isFocused ? accentColor : LuxuryColors.textMuted,
            ),
          ),
          prefixIconConstraints:
              const BoxConstraints(minWidth: 48, minHeight: 48),
          suffixIcon: widget.controller?.text.isNotEmpty == true
              ? Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: IconButton(
                    icon: Icon(
                      Icons.close,
                      size: 18,
                      color: LuxuryColors.textMuted,
                    ),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      widget.controller?.clear();
                      widget.onClear?.call();
                      setState(() {});
                    },
                  ),
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }
}

/// Luxury textarea for multi-line input
class LuxuryTextArea extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? errorText;
  final TextEditingController? controller;
  final int minLines;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final LuxuryTier tier;

  const LuxuryTextArea({
    super.key,
    this.label,
    this.hint,
    this.errorText,
    this.controller,
    this.minLines = 3,
    this.maxLines = 6,
    this.onChanged,
    this.tier = LuxuryTier.gold,
  });

  @override
  State<LuxuryTextArea> createState() => _LuxuryTextAreaState();
}

class _LuxuryTextAreaState extends State<LuxuryTextArea> {
  bool _isFocused = false;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() {
        _isFocused = _focusNode.hasFocus;
      });
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  Color _getAccentColor() {
    switch (widget.tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = _getAccentColor();
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: hasError
                  ? LuxuryColors.errorRuby
                  : (_isFocused
                      ? accentColor
                      : LuxuryColors.textMuted),
              fontWeight: FontWeight.w500,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: hasError
                  ? LuxuryColors.errorRuby
                  : (_isFocused
                      ? accentColor
                      : (isDark
                          ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                          : LuxuryColors.champagneGold.withValues(alpha: 0.15))),
              width: _isFocused ? 1.5 : 1,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: (hasError ? LuxuryColors.errorRuby : accentColor)
                          .withValues(alpha: 0.1),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: TextField(
            controller: widget.controller,
            focusNode: _focusNode,
            onChanged: widget.onChanged,
            minLines: widget.minLines,
            maxLines: widget.maxLines,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              letterSpacing: 0.3,
              height: 1.5,
            ),
            cursorColor: accentColor,
            cursorWidth: 1.5,
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 0.3,
              ),
              filled: true,
              fillColor: isDark ? LuxuryColors.obsidian : Colors.white,
              contentPadding: const EdgeInsets.all(18),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.error_outline,
                size: 14,
                color: LuxuryColors.errorRuby,
              ),
              const SizedBox(width: 4),
              Text(
                widget.errorText!,
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.errorRuby,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Premium dropdown/select field
class LuxuryDropdown<T> extends StatefulWidget {
  final String? label;
  final String? hint;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final LuxuryTier tier;

  const LuxuryDropdown({
    super.key,
    this.label,
    this.hint,
    this.value,
    required this.items,
    this.onChanged,
    this.tier = LuxuryTier.gold,
  });

  @override
  State<LuxuryDropdown<T>> createState() => _LuxuryDropdownState<T>();
}

class _LuxuryDropdownState<T> extends State<LuxuryDropdown<T>> {
  bool _isOpen = false;

  Color _getAccentColor() {
    switch (widget.tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: _isOpen ? accentColor : LuxuryColors.textMuted,
              fontWeight: FontWeight.w500,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isOpen
                  ? accentColor
                  : (isDark
                      ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                      : LuxuryColors.champagneGold.withValues(alpha: 0.15)),
              width: _isOpen ? 1.5 : 1,
            ),
            boxShadow: _isOpen
                ? [
                    BoxShadow(
                      color: accentColor.withValues(alpha: 0.1),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: widget.value,
              items: widget.items,
              onChanged: (value) {
                HapticFeedback.lightImpact();
                widget.onChanged?.call(value);
              },
              onTap: () {
                setState(() {
                  _isOpen = !_isOpen;
                });
              },
              hint: widget.hint != null
                  ? Text(
                      widget.hint!,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: LuxuryColors.textMuted,
                        letterSpacing: 0.3,
                      ),
                    )
                  : null,
              isExpanded: true,
              icon: AnimatedRotation(
                turns: _isOpen ? 0.5 : 0,
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.keyboard_arrow_down,
                  color: _isOpen ? accentColor : LuxuryColors.textMuted,
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
              borderRadius: BorderRadius.circular(12),
              dropdownColor: isDark ? LuxuryColors.obsidian : Colors.white,
              style: IrisTheme.bodyMedium.copyWith(
                color:
                    isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
