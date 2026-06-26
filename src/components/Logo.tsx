type LogoProps = {
  size?: number;
  variant?: "on-light" | "on-dark";
  showWordmark?: boolean;
};

export function Logo({ size = 40, variant = "on-light", showWordmark = true }: LogoProps) {
  const fill = variant === "on-dark" ? "#ffffff" : "#0B7CFF";
  const textFill = variant === "on-dark" ? "#ffffff" : "#0b1e3f";
  const accent = variant === "on-dark" ? "#ffffff" : "#0B7CFF";

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 1254 1254"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g fill={fill}>
          <path d="
            M 746 363
            L 692 359
            L 641 360
            L 579 369
            L 532 383
            L 491 402
            L 464 421
            L 441 443
            L 418 478
            L 409 508
            L 408 525
            L 410 541
            L 414 554
            L 424 571
            L 445 590
            L 477 604
            L 515 611
            L 585 617
            L 629 628
            L 647 638
            L 656 647
            L 663 663
            L 663 678
            L 657 697
            L 635 727
            L 607 752
            L 565 778
            L 523 796
            L 479 809
            L 444 815
            L 401 818
            L 457 828
            L 509 828
            L 538 824
            L 571 816
            L 598 806
            L 627 791
            L 650 775
            L 680 746
            L 698 720
            L 711 689
            L 717 659
            L 727 632
            L 741 604
            L 759 575
            L 791 532
            L 853 460
            L 852 459
            L 804 502
            L 758 547
            L 723 586
            L 697 622
            L 680 609
            L 662 600
            L 633 591
            L 527 579
            L 501 573
            L 480 563
            L 467 551
            L 461 539
            L 459 515
            L 464 498
            L 481 470
            L 502 449
            L 532 428
            L 564 412
            L 604 397
            L 641 387
            L 683 379
            L 734 373
            L 791 371
            Z
          "/>
          <path d="
            M 980 341
            L 978 339
            L 968 339
            L 953 346
            L 942 354
            L 922 374
            L 867 363
            L 847 365
            L 838 373
            L 838 376
            L 890 400
            L 892 405
            L 875 426
            L 856 425
            L 849 428
            L 845 433
            L 862 441
            L 865 450
            L 872 449
            L 881 466
            L 886 463
            L 889 458
            L 888 438
            L 908 423
            L 913 422
            L 940 476
            L 943 475
            L 951 464
            L 952 448
            L 941 395
            L 955 383
            L 974 362
            L 981 347
            Z
          "/>
        </g>
      </svg>
      {showWordmark && (
        <div className="leading-none select-none">
          <div className="text-[17px] font-bold tracking-tight" style={{ color: textFill }}>
            Simply<span style={{ color: accent }}>Fly</span>
          </div>
          <div
            className="text-[9px] font-medium tracking-[0.18em] uppercase mt-0.5"
            style={{ color: variant === "on-dark" ? "rgba(255,255,255,0.55)" : "#64748b" }}
          >
            Less admin. More flying.
          </div>
        </div>
      )}
    </div>
  );
}

export function PlaneIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"
        fill="currentColor"
      />
    </svg>
  );
}
